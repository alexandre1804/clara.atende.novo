import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import type { Professional } from '@/types'
import { ProfessionaisPanel } from '@/components/professionals/ProfessionaisPanel'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profissionais' }

export default async function ProfissionaisPage() {
  const { user } = await requireRole(['owner', 'receptionist'])
  const supabase = await createClient()

  const { data: professionals } = await supabase
    .from('professionals')
    .select('*')
    .eq('clinic_id', user.clinic_id)
    .order('name')

  return (
    <ProfessionaisPanel
      professionals={(professionals ?? []) as Professional[]}
      clinicId={user.clinic_id}
    />
  )
}
