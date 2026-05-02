import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe'
import type { PurchaseType } from '@/types'

const VALID_TYPES: PurchaseType[] = ['credits_starter', 'credits_plus', 'credits_pro']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type } = await req.json()
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid credit pack type' }, { status: 400 })
  }

  const session = await createCheckoutSession({
    type: type as PurchaseType,
    userId: user.id,
  })

  return NextResponse.json({ url: session.url })
}
