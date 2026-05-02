import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramAccountId,
  getInstagramProfile,
  getRecentMedia,
} from '@/lib/instagram'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?ig_error=1`)
  }

  const storedState = req.cookies.get('ig_oauth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?ig_error=state`)
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?ig_error=no_code`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)
  }

  try {
    const shortToken = await exchangeCodeForToken(code)
    const longToken = await getLongLivedToken(shortToken.access_token)
    const igAccountId = await getInstagramAccountId(longToken.access_token)
    const igProfile = await getInstagramProfile(igAccountId, longToken.access_token)
    const media = await getRecentMedia(igAccountId, longToken.access_token)

    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
      : null

    const admin = createAdminClient()
    await admin.from('instagram_profiles').upsert({
      user_id: user.id,
      instagram_user_id: igProfile.id,
      username: igProfile.username,
      full_name: igProfile.name ?? null,
      bio: igProfile.biography ?? null,
      followers_count: igProfile.followers_count ?? 0,
      following_count: igProfile.follows_count ?? 0,
      media_count: igProfile.media_count ?? 0,
      profile_picture_url: igProfile.profile_picture_url ?? null,
      access_token: longToken.access_token,
      token_expires_at: expiresAt,
      raw_media: media,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?ig_connected=1`
    )
    response.cookies.delete('ig_oauth_state')
    return response
  } catch (err) {
    console.error('Instagram callback error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?ig_error=fetch`
    )
  }
}
