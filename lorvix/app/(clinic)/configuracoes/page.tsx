import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import type { Clinic, WhatsappConfig, NotificationTemplate } from '@/types'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Configurações' }

export default async function ConfiguracoesPage() {
  const { user } = await requireRole(['owner'])
  const supabase = await createClient()

  const [{ data: clinic }, { data: waConfig }, { data: templates }] = await Promise.all([
    supabase.from('clinics').select('*').eq('id', user.clinic_id).single(),
    supabase.from('whatsapp_config').select('*').eq('clinic_id', user.clinic_id).single(),
    supabase.from('notification_templates').select('*').eq('clinic_id', user.clinic_id),
  ])

  return (
    <SettingsPanel
      clinic={clinic as Clinic}
      waConfig={waConfig as WhatsappConfig | null}
      templates={(templates ?? []) as NotificationTemplate[]}
    />
  )
}
