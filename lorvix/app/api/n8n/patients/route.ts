import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function validateSecret(request: NextRequest) {
  return request.headers.get('x-api-secret') === process.env.N8N_API_SECRET
}

// GET /api/n8n/patients?clinic_id=&phone=
export async function GET(request: NextRequest) {
  if (!validateSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const clinic_id = searchParams.get('clinic_id')
  const phone     = searchParams.get('phone')

  if (!clinic_id || !phone) {
    return NextResponse.json({ error: 'clinic_id e phone são obrigatórios' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const digits = phone.replace(/\D/g, '')

  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, phone, email, birth_date, insurance, notes')
    .eq('clinic_id', clinic_id)
    .eq('phone', digits)
    .single()

  if (!patient) {
    return NextResponse.json({ found: false, patient: null })
  }

  return NextResponse.json({ found: true, patient })
}

// POST /api/n8n/patients
export async function POST(request: NextRequest) {
  if (!validateSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { clinic_id, full_name, phone } = body
  if (!clinic_id || !full_name || !phone) {
    return NextResponse.json({ error: 'clinic_id, full_name e phone são obrigatórios' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const digits = String(phone).replace(/\D/g, '')

  // Upsert by phone
  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('clinic_id', clinic_id)
    .eq('phone', digits)
    .single()

  if (existing) {
    return NextResponse.json({ created: false, patient_id: existing.id, message: 'Paciente já cadastrado.' })
  }

  const { data: patient, error } = await supabase
    .from('patients')
    .insert({
      clinic_id,
      full_name:  String(full_name).trim(),
      phone:      digits,
      email:      body.email ? String(body.email) : null,
      birth_date: body.birth_date ? String(body.birth_date) : null,
      insurance:  body.insurance ? String(body.insurance) : null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ created: true, patient_id: patient.id }, { status: 201 })
}
