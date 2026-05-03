import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { PatientsPanel } from '@/components/patients/PatientsPanel'
import type { Patient } from '@/types'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pacientes' }

export default async function PacientesPage() {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', user.clinic_id)
    .order('full_name')

  return (
    <PatientsPanel
      patients={(patients ?? []) as Patient[]}
      clinicId={user.clinic_id}
    />
  )
}
