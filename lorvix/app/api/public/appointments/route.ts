import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/public/appointments — booking online sem autenticação
// Rate limit deve ser aplicado via Nginx/middleware em produção
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { clinic_id, professional_id, service, start_datetime, patient } = body

  if (!clinic_id || !professional_id || !service || !start_datetime || !patient) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const p = patient as Record<string, string>
  if (!p.full_name || !p.phone) {
    return NextResponse.json({ error: 'Nome e telefone do paciente são obrigatórios' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify clinic exists and is active
  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, is_active')
    .eq('id', clinic_id)
    .single()

  if (!clinic?.is_active) {
    return NextResponse.json({ error: 'Clínica não disponível' }, { status: 404 })
  }

  const startDt = new Date(String(start_datetime))
  const endDt   = new Date(startDt.getTime() + 30 * 60000)

  // Conflict check
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id')
    .eq('clinic_id', clinic_id)
    .eq('professional_id', professional_id)
    .not('status', 'in', '(cancelled)')
    .lt('start_datetime', endDt.toISOString())
    .gt('end_datetime', startDt.toISOString())

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'Horário não disponível. Escolha outro.' }, { status: 409 })
  }

  // Find or create patient
  const phone = p.phone.replace(/\D/g, '')
  const { data: existingPatient } = await supabase
    .from('patients')
    .select('id')
    .eq('clinic_id', clinic_id)
    .eq('phone', phone)
    .single()

  let patientId: string
  if (existingPatient) {
    patientId = existingPatient.id
  } else {
    const { data: newPatient, error: pErr } = await supabase
      .from('patients')
      .insert({ clinic_id, full_name: p.full_name.trim(), phone, email: p.email ?? null })
      .select('id')
      .single()
    if (pErr || !newPatient) {
      return NextResponse.json({ error: 'Erro ao cadastrar paciente' }, { status: 500 })
    }
    patientId = newPatient.id
  }

  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      clinic_id,
      patient_id:      patientId,
      professional_id,
      service:         String(service).trim(),
      start_datetime:  startDt.toISOString(),
      end_datetime:    endDt.toISOString(),
      status:          'scheduled',
      source:          'online',
    })
    .select('id, start_datetime, end_datetime, service')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, appointment: appt }, { status: 201 })
}
