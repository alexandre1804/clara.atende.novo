import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ClinicUser } from '@/types'

export async function requireAuth(): Promise<{ user: ClinicUser }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!clinicUser) redirect('/login')

  return { user: clinicUser as ClinicUser }
}

export async function requireRole(
  roles: ClinicUser['role'][],
): Promise<{ user: ClinicUser }> {
  const { user } = await requireAuth()
  if (!roles.includes(user.role)) redirect('/agenda')
  return { user }
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
