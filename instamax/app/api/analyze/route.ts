import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAnalysis, generateSchedule } from '@/lib/openai'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { analysisId } = await req.json()
  if (!analysisId) return NextResponse.json({ error: 'analysisId required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: analysis } = await admin
    .from('analyses')
    .select('*, instagram_profiles(*)')
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single()

  if (!analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  if (analysis.status === 'complete') return NextResponse.json({ analysis })
  if (analysis.payment_id === null) return NextResponse.json({ error: 'Payment required' }, { status: 402 })

  await admin.from('analyses').update({ status: 'processing' }).eq('id', analysisId)

  try {
    const profile = analysis.instagram_profiles
    const media = profile.raw_media ?? []

    const analysisData = await generateAnalysis(profile, media, analysis.niche, analysis.objective)

    await admin.from('analyses').update({
      status: 'complete',
      analysis_data: analysisData,
    }).eq('id', analysisId)

    // Gerar cronograma da semana incluso
    const scheduleData = await generateSchedule(profile, analysisData, 'week')

    await admin.from('schedules').insert({
      user_id: user.id,
      analysis_id: analysisId,
      type: 'week',
      status: 'complete',
      included_with_analysis: true,
      schedule_data: scheduleData,
    })

    return NextResponse.json({ success: true, analysisId })
  } catch (err) {
    console.error('Analysis error:', err)
    await admin.from('analyses').update({ status: 'failed' }).eq('id', analysisId)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
