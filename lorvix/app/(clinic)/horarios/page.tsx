import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { HorariosPanel } from '@/components/availability/HorariosPanel'
import type { Availability } from '@/types'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Horários de Funcionamento' }

export default async function HorariosPage() {
  const { user } = await requireRole(['owner', 'receptionist'])
  const supabase  = await createClient()

  const { data } = await supabase
    .from('availability')
    .select('*')
    .eq('clinic_id', user.clinic_id)
    .is('professional_id', null)
    .order('day_of_week')

  return (
    <HorariosPanel
      clinicId={user.clinic_id}
      availability={(data ?? []) as Availability[]}
      readonly={user.role === 'doctor'}
    />
  )
}
