import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/public/availability?clinic_id=&professional_id=&date=
// Endpoint público para a página de agendamento (sem x-api-secret)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const clinic_id       = searchParams.get('clinic_id')
  const professional_id = searchParams.get('professional_id')
  const date            = searchParams.get('date')

  if (!clinic_id || !professional_id || !date) {
    return NextResponse.json({ error: 'Parâmetros faltando' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const targetDate = new Date(`${date}T00:00:00`)
  const dayOfWeek  = targetDate.getDay()

  const { data: slots } = await supabase
    .from('availability')
    .select('start_time, end_time, slot_duration')
    .eq('clinic_id', clinic_id)
    .eq('professional_id', professional_id)
    .eq('day_of_week', dayOfWeek)

  if (!slots || slots.length === 0) {
    return NextResponse.json({ available_slots: [] })
  }

  const startOfDay = `${date}T00:00:00`
  const endOfDay   = `${date}T23:59:59`

  const [{ data: appointments }, { data: blocks }] = await Promise.all([
    supabase
      .from('appointments')
      .select('start_datetime, end_datetime')
      .eq('clinic_id', clinic_id)
      .eq('professional_id', professional_id)
      .gte('start_datetime', startOfDay)
      .lte('start_datetime', endOfDay)
      .not('status', 'in', '(cancelled)'),
    supabase
      .from('schedule_blocks')
      .select('start_datetime, end_datetime')
      .eq('clinic_id', clinic_id)
      .eq('professional_id', professional_id)
      .lte('start_datetime', endOfDay)
      .gte('end_datetime', startOfDay),
  ])

  const bookedRanges = [
    ...(appointments ?? []).map((a) => ({ start: new Date(a.start_datetime), end: new Date(a.end_datetime) })),
    ...(blocks ?? []).map((b) => ({ start: new Date(b.start_datetime), end: new Date(b.end_datetime) })),
  ]

  const available: string[] = []
  const now = new Date()

  for (const slot of slots) {
    const [sh, sm] = slot.start_time.split(':').map(Number)
    const [eh, em] = slot.end_time.split(':').map(Number)
    const dur = slot.slot_duration ?? 30
    let cur = new Date(targetDate); cur.setHours(sh, sm, 0, 0)
    const end = new Date(targetDate); end.setHours(eh, em, 0, 0)

    while (cur < end) {
      const next = new Date(cur.getTime() + dur * 60000)
      if (next > end) break
      if (cur > now && !bookedRanges.some((r) => cur < r.end && next > r.start)) {
        available.push(cur.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      }
      cur = next
    }
  }

  return NextResponse.json({ available_slots: available })
}
