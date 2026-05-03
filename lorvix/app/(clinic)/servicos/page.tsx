import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { ServicosPanel } from '@/components/servicos/ServicosPanel'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Serviços' }

export interface Service {
  id: string
  clinic_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  category: string | null
  is_active: boolean
  created_at: string
}

export default async function ServicosPage() {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('clinic_id', user.clinic_id)
    .order('name')

  return (
    <ServicosPanel
      services={(services ?? []) as Service[]}
      clinicId={user.clinic_id}
    />
  )
}
