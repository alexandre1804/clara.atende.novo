import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function validateSecret(request: NextRequest) {
  const secret = request.headers.get('x-api-secret')
  return secret === process.env.N8N_API_SECRET
}

// GET /api/n8n/availability?clinic_id=&professional_id=&date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const clinic_id       = searchParams.get('clinic_id')
  const professional_id = searchParams.get('professional_id')
  const date            = searchParams.get('date') // YYYY-MM-DD

  if (!clinic_id || !professional_id || !date) {
    return NextResponse.json({ error: 'clinic_id, professional_id e date são obrigatórios' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get the day of week (0=Sunday, 6=Saturday)
  const targetDate = new Date(`${date}T00:00:00`)
  const dayOfWeek = targetDate.getDay()

  // Fetch availability for that professional on that weekday
  const { data: slots } = await supabase
    .from('availability')
    .select('start_time, end_time, slot_duration')
    .eq('clinic_id', clinic_id)
    .eq('professional_id', professional_id)
    .eq('day_of_week', dayOfWeek)

  if (!slots || slots.length === 0) {
    return NextResponse.json({ available_slots: [], date, message: 'Sem disponibilidade neste dia.' })
  }

  // Fetch existing appointments for that day
  const startOfDay = `${date}T00:00:00`
  const endOfDay   = `${date}T23:59:59`

  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_datetime, end_datetime')
    .eq('clinic_id', clinic_id)
    .eq('professional_id', professional_id)
    .gte('start_datetime', startOfDay)
    .lte('start_datetime', endOfDay)
    .not('status', 'in', '(cancelled)')

  // Fetch schedule blocks
  const { data: blocks } = await supabase
    .from('schedule_blocks')
    .select('start_datetime, end_datetime')
    .eq('clinic_id', clinic_id)
    .eq('professional_id', professional_id)
    .lte('start_datetime', endOfDay)
    .gte('end_datetime', startOfDay)

  const bookedRanges = [
    ...(appointments ?? []).map((a) => ({
      start: new Date(a.start_datetime),
      end: new Date(a.end_datetime),
    })),
    ...(blocks ?? []).map((b) => ({
      start: new Date(b.start_datetime),
      end: new Date(b.end_datetime),
    })),
  ]

  function isSlotFree(slotStart: Date, slotEnd: Date) {
    return !bookedRanges.some(
      (r) => slotStart < r.end && slotEnd > r.start,
    )
  }

  const availableSlots: string[] = []

  for (const slot of slots) {
    const [sh, sm] = slot.start_time.split(':').map(Number)
    const [eh, em] = slot.end_time.split(':').map(Number)
    const duration = slot.slot_duration ?? 30

    let current = new Date(targetDate)
    current.setHours(sh, sm, 0, 0)

    const slotEnd = new Date(targetDate)
    slotEnd.setHours(eh, em, 0, 0)

    while (current < slotEnd) {
      const next = new Date(current.getTime() + duration * 60000)
      if (next > slotEnd) break

      if (isSlotFree(current, next)) {
        availableSlots.push(
          current.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        )
      }
      current = next
    }
  }

  return NextResponse.json({
    date,
    professional_id,
    available_slots: availableSlots,
    total: availableSlots.length,
  })
}
