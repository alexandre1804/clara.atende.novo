import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function validateSecret(request: NextRequest) {
  return request.headers.get('x-api-secret') === process.env.N8N_API_SECRET
}

// POST /api/n8n/appointments
export async function POST(request: NextRequest) {
  if (!validateSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const {
    clinic_id, patient_id, professional_id,
    service, start_datetime, duration_minutes, notes,
  } = body

  if (!clinic_id || !professional_id || !service || !start_datetime) {
    return NextResponse.json(
      { error: 'clinic_id, professional_id, service e start_datetime são obrigatórios' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const startDt = new Date(String(start_datetime))
  if (isNaN(startDt.getTime())) {
    return NextResponse.json({ error: 'start_datetime inválido. Use ISO 8601.' }, { status: 400 })
  }

  const durationMs = (Number(duration_minutes) || 30) * 60000
  const endDt = new Date(startDt.getTime() + durationMs)

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id')
    .eq('clinic_id', clinic_id)
    .eq('professional_id', professional_id)
    .not('status', 'in', '(cancelled)')
    .lt('start_datetime', endDt.toISOString())
    .gt('end_datetime', startDt.toISOString())

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: 'Conflito de horário. Este slot já está ocupado.' },
      { status: 409 },
    )
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      clinic_id,
      patient_id:      patient_id ?? null,
      professional_id,
      service:         String(service).trim(),
      start_datetime:  startDt.toISOString(),
      end_datetime:    endDt.toISOString(),
      status:          'scheduled',
      notes:           notes ? String(notes) : null,
      source:          'whatsapp',
    })
    .select('id, start_datetime, end_datetime, service, status')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ created: true, appointment }, { status: 201 })
}
