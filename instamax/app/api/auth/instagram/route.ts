import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstagramAuthUrl } from '@/lib/instagram'
import { randomBytes } from 'crypto'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = randomBytes(16).toString('hex')
  const url = getInstagramAuthUrl(state)

  const response = NextResponse.redirect(url)
  response.cookies.set('ig_oauth_state', state, { httpOnly: true, maxAge: 600 })
  return response
}
