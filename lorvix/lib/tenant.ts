import { createAdminClient } from '@/lib/supabase/admin'
import type { Clinic } from '@/types'

export async function getClinicBySlug(slug: string): Promise<Clinic | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clinics')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data
}

export function extractSlugFromHost(host: string): string | null {
  const baseDomain = process.env.BASE_DOMAIN ?? 'lorvix.com.br'
  // app.lorvix.com.br → admin panel
  if (host === `app.${baseDomain}`) return null
  // {slug}.lorvix.com.br → tenant
  const match = host.match(new RegExp(`^([a-z0-9-]+)\\.${baseDomain.replace('.', '\\.')}$`))
  return match ? match[1] : null
}
