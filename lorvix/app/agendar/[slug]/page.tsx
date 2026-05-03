import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { PublicBooking } from '@/components/booking/PublicBooking'
import type { Professional, Clinic } from '@/types'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data: clinic } = await supabase.from('clinics').select('name').eq('slug', slug).single()
  return { title: clinic ? `Agendar — ${clinic.name}` : 'Agendar' }
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, name, slug, primary_color, secondary_color, logo_url, phone')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!clinic) notFound()

  const { data: professionals } = await supabase
    .from('professionals')
    .select('id, name, specialty, bio, avatar_url, color')
    .eq('clinic_id', clinic.id)
    .eq('is_active', true)
    .order('name')

  return (
    <PublicBooking
      clinic={clinic as Clinic}
      professionals={(professionals ?? []) as Professional[]}
    />
  )
}
