import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata!
    const admin = createAdminClient()

    await admin.from('payments').insert({
      user_id: meta.user_id,
      stripe_payment_id: session.id,
      type: meta.type,
      amount: session.amount_total,
      status: 'complete',
      metadata: meta,
    })

    if (meta.type === 'analysis') {
      await admin
        .from('analyses')
        .update({ payment_id: session.id })
        .eq('id', meta.analysis_id)
        .eq('user_id', meta.user_id)
    }

    if (meta.type === 'schedule_week' || meta.type === 'schedule_month') {
      await admin
        .from('schedules')
        .update({ payment_id: session.id })
        .eq('id', meta.schedule_id)
        .eq('user_id', meta.user_id)
    }

    if (meta.type === 'image') {
      // Crédito de imagem liberado — processado no frontend após redirect
    }
  }

  return NextResponse.json({ received: true })
}
