import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { CalendarView } from '@/components/agenda/CalendarView'
import type { Appointment, Professional } from '@/types'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Agenda' }

export default async function AgendaPage() {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfWeek = new Date(today.setDate(today.getDate() + 7)).toISOString()

  const [{ data: appointments }, { data: professionals }] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, patient:patients(id,full_name,phone), professional:professionals(id,name,color)')
      .eq('clinic_id', user.clinic_id)
      .gte('start_datetime', startOfDay)
      .lte('start_datetime', endOfWeek)
      .order('start_datetime'),
    supabase
      .from('professionals')
      .select('id,name,color,specialty')
      .eq('clinic_id', user.clinic_id)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <CalendarView
      appointments={(appointments ?? []) as Appointment[]}
      professionals={(professionals ?? []) as Professional[]}
      clinicId={user.clinic_id}
      userRole={user.role}
    />
  )
}
