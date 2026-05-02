import Stripe from 'stripe'
import type { PurchaseType } from '@/types'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as const,
})

export const PRICES: Record<PurchaseType, { amount: number; label: string; priceId: string }> = {
  analysis: {
    amount: 3900,
    label: 'Análise de Perfil + Cronograma da Semana',
    priceId: process.env.STRIPE_PRICE_ANALYSIS!,
  },
  schedule_week: {
    amount: 1900,
    label: 'Cronograma Semanal',
    priceId: process.env.STRIPE_PRICE_WEEK!,
  },
  schedule_month: {
    amount: 2900,
    label: 'Cronograma Mensal',
    priceId: process.env.STRIPE_PRICE_MONTH!,
  },
  image: {
    amount: 100,
    label: 'Geração de Imagem',
    priceId: process.env.STRIPE_PRICE_IMAGE!,
  },
}

export async function createCheckoutSession({
  type,
  userId,
  analysisId,
  scheduleId,
  metadata = {},
}: {
  type: PurchaseType
  userId: string
  analysisId?: string
  scheduleId?: string
  metadata?: Record<string, string>
}) {
  const price = PRICES[type]

  const successParams = new URLSearchParams({ success: '1', type })
  if (analysisId) successParams.set('aid', analysisId)
  if (scheduleId) successParams.set('sid', scheduleId)
  successParams.set('session_id', '{CHECKOUT_SESSION_ID}')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: { name: `InstaMax — ${price.label}` },
          unit_amount: price.amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?${successParams}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=1`,
    metadata: {
      user_id: userId,
      type,
      analysis_id: analysisId ?? '',
      schedule_id: scheduleId ?? '',
      ...metadata,
    },
  })

  return session
}
