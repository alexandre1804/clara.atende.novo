import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSchedule } from '@/lib/openai'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scheduleId } = await req.json()
  if (!scheduleId) return NextResponse.json({ error: 'scheduleId required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: schedule } = await admin
    .from('schedules')
    .select('*, analyses(*, instagram_profiles(*))')
    .eq('id', scheduleId)
    .eq('user_id', user.id)
    .single()

  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
  if (schedule.status === 'complete') return NextResponse.json({ schedule })
  if (!schedule.included_with_analysis && schedule.payment_id === null) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 })
  }

  await admin.from('schedules').update({ status: 'processing' }).eq('id', scheduleId)

  try {
    const analysis = schedule.analyses
    const profile = analysis.instagram_profiles

    const scheduleData = await generateSchedule(profile, analysis.analysis_data, schedule.type)

    await admin.from('schedules').update({
      status: 'complete',
      schedule_data: scheduleData,
    }).eq('id', scheduleId)

    return NextResponse.json({ success: true, scheduleId })
  } catch (err) {
    console.error('Schedule error:', err)
    await admin.from('schedules').update({ status: 'failed' }).eq('id', scheduleId)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
