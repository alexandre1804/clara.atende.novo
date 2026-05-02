const APP_ID = process.env.INSTAGRAM_APP_ID!
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`

export function getInstagramAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list',
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  token_type: string
  expires_in?: number
}> {
  const params = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: REDIRECT_URI,
    code,
  })
  const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`)
  if (!res.ok) throw new Error('Failed to exchange code for token')
  return res.json()
}

export async function getLongLivedToken(shortToken: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: shortToken,
  })
  const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`)
  if (!res.ok) throw new Error('Failed to get long-lived token')
  return res.json()
}

export async function getInstagramAccountId(accessToken: string): Promise<string> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
  )
  const data = await res.json()
  if (!data.data?.[0]?.id) throw new Error('No Facebook pages found')

  const pageId = data.data[0].id
  const pageToken = data.data[0].access_token

  const igRes = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
  )
  const igData = await igRes.json()
  if (!igData.instagram_business_account?.id) throw new Error('No Instagram account linked to page')
  return igData.instagram_business_account.id
}

export async function getInstagramProfile(igAccountId: string, accessToken: string) {
  const fields = 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url'
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}?fields=${fields}&access_token=${accessToken}`
  )
  if (!res.ok) throw new Error('Failed to fetch Instagram profile')
  return res.json()
}

export async function getRecentMedia(igAccountId: string, accessToken: string, limit = 12) {
  const fields = 'id,media_type,media_url,thumbnail_url,caption,like_count,comments_count,timestamp,permalink'
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
  )
  if (!res.ok) throw new Error('Failed to fetch media')
  const data = await res.json()
  return data.data ?? []
}
