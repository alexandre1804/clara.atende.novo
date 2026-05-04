import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'

const HEX = /^#[0-9A-Fa-f]{6}$/

export async function PATCH(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireRole>>['user']
  try {
    ;({ user } = await requireRole(['owner']))
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await req.json() as Record<string, unknown>
  const { name, phone, email, address, primary_color, secondary_color } = body

  if (primary_color && !HEX.test(String(primary_color))) {
    return NextResponse.json({ error: 'Cor inválida.' }, { status: 400 })
  }
  if (secondary_color && !HEX.test(String(secondary_color))) {
    return NextResponse.json({ error: 'Cor inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('clinics')
    .update({
      ...(name !== undefined          && { name:            String(name).trim() }),
      ...(phone !== undefined         && { phone:           String(phone).trim() }),
      ...(email !== undefined         && { email:           String(email).trim() }),
      ...(address !== undefined       && { address:         String(address).trim() }),
      ...(primary_color !== undefined && { primary_color:   String(primary_color) }),
      ...(secondary_color !== undefined && { secondary_color: String(secondary_color) }),
    })
    .eq('id', user.clinic_id)

  if (error) {
    console.error('[settings] supabase update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
