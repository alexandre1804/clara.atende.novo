import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user } = await requireRole(['owner'])
    const supabase = await createClient()
    const { data } = await supabase
      .from('clinic_users')
      .select('id, full_name, email, role, created_at')
      .eq('clinic_id', user.clinic_id)
      .order('created_at')
    return NextResponse.json({ users: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await requireRole(['owner'])
    const body = await req.json() as { full_name?: string; email?: string; password?: string; role?: string }
    const { full_name, email, password, role } = body

    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }
    if (!['receptionist', 'doctor'].includes(role)) {
      return NextResponse.json({ error: 'Role inválido.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter ao menos 8 caracteres.' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: insertError } = await adminSupabase
      .from('clinic_users')
      .insert({
        id: authData.user.id,
        clinic_id: user.clinic_id,
        email,
        full_name,
        role,
      })

    if (insertError) {
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { user } = await requireRole(['owner'])
    const { id } = await req.json() as { id?: string }
    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })
    if (id === user.id) return NextResponse.json({ error: 'Não é possível remover seu próprio usuário.' }, { status: 400 })

    const supabase = await createClient()
    const { data: target } = await supabase
      .from('clinic_users')
      .select('id')
      .eq('id', id)
      .eq('clinic_id', user.clinic_id)
      .single()

    if (!target) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })

    const adminSupabase = createAdminClient()
    await adminSupabase.from('clinic_users').delete().eq('id', id)
    await adminSupabase.auth.admin.deleteUser(id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
}
