export interface SearchResult {
  title: string
  link: string
  snippet: string
}

interface SerperItem {
  title: string
  link: string
  snippet?: string
}

interface SerperResponse {
  organic?: SerperItem[]
  error?: string
}

export async function searchGoogle(
  query: string,
  location: string,
  num: number
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY

  if (!apiKey) {
    throw new Error('SERPER_API_KEY não configurada no .env.local')
  }

  const results: SearchResult[] = []
  const pageSize = 10
  const pages = Math.ceil(Math.min(num, 100) / pageSize)

  for (let page = 0; page < pages; page++) {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${query} ${location}`,
        num: pageSize,
        page: page + 1,
        gl: 'br',
        hl: 'pt',
      }),
    })

    const data: SerperResponse = await response.json()

    if (!response.ok) {
      throw new Error(data.error ?? `Serper API error: ${response.status}`)
    }

    if (!data.organic || data.organic.length === 0) break

    results.push(
      ...data.organic.map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet ?? '',
      }))
    )

    if (results.length >= num) break
  }

  return results.slice(0, num)
}
