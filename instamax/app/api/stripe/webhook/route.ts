import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

const CREDIT_AMOUNTS: Record<string, number> = {
  credits_starter: 8,
  credits_plus: 30,
  credits_pro: 60,
}

const ANALYSIS_BONUS_CREDITS = 5

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

      // Bônus de créditos inclusos na análise
      await admin.rpc('add_credits', {
        p_user_id: meta.user_id,
        p_amount: ANALYSIS_BONUS_CREDITS,
        p_type: 'bonus',
        p_description: `${ANALYSIS_BONUS_CREDITS} créditos bônus inclusos na análise`,
      })
    }

    if (meta.type === 'schedule_week' || meta.type === 'schedule_month') {
      await admin
        .from('schedules')
        .update({ payment_id: session.id })
        .eq('id', meta.schedule_id)
        .eq('user_id', meta.user_id)
    }

    const creditAmount = CREDIT_AMOUNTS[meta.type]
    if (creditAmount) {
      await admin.rpc('add_credits', {
        p_user_id: meta.user_id,
        p_amount: creditAmount,
        p_type: 'purchase',
        p_description: `Compra de ${creditAmount} créditos — ${meta.type}`,
      })
    }
  }

  return NextResponse.json({ received: true })
}
