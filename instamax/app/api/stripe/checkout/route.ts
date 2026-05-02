import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCheckoutSession } from '@/lib/stripe'
import type { PurchaseType } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, niche, objective, analysisId } = await req.json()
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })

  const admin = createAdminClient()

  // Para análise: criar registro antes do pagamento
  let targetAnalysisId = analysisId
  if (type === 'analysis') {
    const { data: profile } = await admin
      .from('instagram_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Connect Instagram first' }, { status: 400 })
    }

    const { data: newAnalysis } = await admin
      .from('analyses')
      .insert({
        user_id: user.id,
        instagram_profile_id: profile.id,
        niche: niche ?? '',
        objective: objective ?? '',
        status: 'pending',
      })
      .select('id')
      .single()

    targetAnalysisId = newAnalysis?.id
  }

  // Para cronograma: criar registro
  let scheduleId: string | undefined
  if (type === 'schedule_week' || type === 'schedule_month') {
    if (!analysisId) return NextResponse.json({ error: 'analysisId required' }, { status: 400 })
    const schedType = type === 'schedule_week' ? 'week' : 'month'

    const { data: newSchedule } = await admin
      .from('schedules')
      .insert({
        user_id: user.id,
        analysis_id: analysisId,
        type: schedType,
        status: 'pending',
        included_with_analysis: false,
      })
      .select('id')
      .single()

    scheduleId = newSchedule?.id
  }

  const session = await createCheckoutSession({
    type: type as PurchaseType,
    userId: user.id,
    analysisId: targetAnalysisId,
    metadata: {
      ...(scheduleId ? { schedule_id: scheduleId } : {}),
      niche: niche ?? '',
      objective: objective ?? '',
    },
  })

  return NextResponse.json({ url: session.url })
}
