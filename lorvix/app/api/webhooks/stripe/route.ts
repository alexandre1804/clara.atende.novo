import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      const isActive = sub.status === 'active' || sub.status === 'trialing'

      // Determine plan from price metadata
      const priceId = sub.items.data[0]?.price.id ?? ''
      let plan: 'basic' | 'pro' | 'enterprise' = 'basic'
      if (priceId.includes('pro'))        plan = 'pro'
      if (priceId.includes('enterprise')) plan = 'enterprise'

      await supabase
        .from('clinics')
        .update({
          is_active:              isActive,
          stripe_subscription_id: sub.id,
          plan,
        })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      await supabase
        .from('clinics')
        .update({ is_active: false })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? '')

      await supabase
        .from('clinics')
        .update({ is_active: false })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? '')

      await supabase
        .from('clinics')
        .update({ is_active: true })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
