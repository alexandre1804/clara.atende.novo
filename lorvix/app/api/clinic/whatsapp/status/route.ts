import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getClinicWaConfig() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('id', user.id)
    .single()
  if (!clinicUser) return null

  const { data: waConfig } = await supabase
    .from('whatsapp_config')
    .select('instance_name, api_url')
    .eq('clinic_id', clinicUser.clinic_id)
    .single()

  return waConfig
}

// GET /api/clinic/whatsapp/status
export async function GET() {
  const waConfig = await getClinicWaConfig()
  if (!waConfig) return NextResponse.json({ state: 'not_configured' })

  const apiKey = process.env.EVOLUTION_API_KEY
  const apiUrl = (waConfig.api_url ?? process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
  if (!apiKey || !apiUrl) return NextResponse.json({ state: 'not_configured' })

  try {
    const res = await fetch(
      `${apiUrl}/instance/connectionState/${waConfig.instance_name}`,
      { headers: { apikey: apiKey }, cache: 'no-store' },
    )
    if (!res.ok) return NextResponse.json({ state: 'disconnected' })

    const data = await res.json()
    // Evolution API v2: { instance: { instanceName, state } }
    const state: string = data.instance?.state ?? data.state ?? 'disconnected'
    return NextResponse.json({ state })
  } catch {
    return NextResponse.json({ state: 'error' })
  }
}
