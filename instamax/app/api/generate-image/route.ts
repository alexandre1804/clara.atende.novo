import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateImage } from '@/lib/openai'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt, analysisId, scheduleId, contentItemId, paymentId, styleContext } = await req.json()

  if (!prompt || !analysisId) {
    return NextResponse.json({ error: 'prompt and analysisId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: analysis } = await admin
    .from('analyses')
    .select('analysis_data')
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single()

  if (!analysis?.analysis_data) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  }

  try {
    const { url, revised_prompt } = await generateImage(
      prompt,
      analysis.analysis_data,
      styleContext ?? ''
    )

    await admin.from('generated_images').insert({
      user_id: user.id,
      analysis_id: analysisId,
      schedule_id: scheduleId ?? null,
      content_item_id: contentItemId ?? null,
      prompt,
      revised_prompt,
      image_url: url,
      payment_id: paymentId ?? null,
    })

    return NextResponse.json({ url, revised_prompt })
  } catch (err) {
    console.error('Image generation error:', err)
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
  }
}
