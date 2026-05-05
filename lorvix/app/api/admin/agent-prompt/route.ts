import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { clinicId, instructions } = await req.json() as { clinicId: string; instructions: string }

  if (!clinicId) {
    return NextResponse.json({ error: 'clinicId obrigatório.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('whatsapp_config')
    .update({ agent_instructions: instructions ?? '' })
    .eq('clinic_id', clinicId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
