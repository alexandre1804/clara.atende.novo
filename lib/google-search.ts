export interface SearchResult {
  title: string
  link: string
  snippet: string
}

interface GoogleApiItem {
  title: string
  link: string
  snippet?: string
}

interface GoogleApiResponse {
  items?: GoogleApiItem[]
  error?: { message: string; code: number }
}

export async function searchGoogle(
  query: string,
  location: string,
  num: number
): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY
  const cx = process.env.GOOGLE_CX

  if (!apiKey || !cx) {
    throw new Error('Credenciais da Google API não configuradas. Configure GOOGLE_API_KEY e GOOGLE_CX no .env.local')
  }

  const searchQuery = `${query} ${location}`
  const results: SearchResult[] = []
  const requestsNeeded = Math.ceil(Math.min(num, 100) / 10)

  for (let i = 0; i < requestsNeeded; i++) {
    const start = i * 10 + 1
    const url = new URL('https://www.googleapis.com/customsearch/v1')
    url.searchParams.set('key', apiKey)
    url.searchParams.set('cx', cx)
    url.searchParams.set('q', searchQuery)
    url.searchParams.set('num', '10')
    url.searchParams.set('start', String(start))

    const response = await fetch(url.toString())
    const data: GoogleApiResponse = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message ?? `Google API error: ${response.status}`)
    }

    if (!data.items || data.items.length === 0) break

    results.push(
      ...data.items.map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet ?? '',
      }))
    )

    if (results.length >= num) break
  }

  return results.slice(0, num)
}
