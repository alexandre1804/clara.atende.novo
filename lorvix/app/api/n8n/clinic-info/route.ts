import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function validateSecret(request: NextRequest) {
  return request.headers.get('x-api-secret') === process.env.N8N_API_SECRET
}

// GET /api/n8n/clinic-info?clinic_id=
export async function GET(request: NextRequest) {
  if (!validateSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clinic_id = request.nextUrl.searchParams.get('clinic_id')
  if (!clinic_id) return NextResponse.json({ error: 'clinic_id é obrigatório' }, { status: 400 })

  const supabase = createAdminClient()

  const [{ data: clinic }, { data: professionals }, { data: waConfig }] = await Promise.all([
    supabase
      .from('clinics')
      .select('id, name, slug, phone, email, address, plan, is_active')
      .eq('id', clinic_id)
      .single(),
    supabase
      .from('professionals')
      .select('id, name, specialty, bio')
      .eq('clinic_id', clinic_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('whatsapp_config')
      .select('agent_name, agent_instructions')
      .eq('clinic_id', clinic_id)
      .single(),
  ])

  if (!clinic) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
  if (!clinic.is_active) return NextResponse.json({ error: 'Clínica inativa' }, { status: 403 })

  return NextResponse.json({
    clinic,
    professionals: professionals ?? [],
    agent: {
      name:         waConfig?.agent_name ?? 'Assistente',
      instructions: waConfig?.agent_instructions ?? '',
    },
  })
}
