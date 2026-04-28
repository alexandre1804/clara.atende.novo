import * as cheerio from 'cheerio'

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX_BR = /(\(?\d{2}\)?\s?[-.]?)(\d{4,5}[-.\s]?\d{4})/g

const INVALID_EMAIL_FRAGMENTS = [
  'example.com', 'domain.com', 'email.com', 'test.com',
  'sentry.io', 'wixpress.com', 'squarespace.com', 'wordpress.com',
  '.png', '.jpg', '.gif', '.svg', '.webp',
]

function isValidEmail(email: string): boolean {
  if (email.length > 100) return false
  const lower = email.toLowerCase()
  if (INVALID_EMAIL_FRAGMENTS.some((f) => lower.includes(f))) return false
  // Must have at least one dot in domain
  const [, domain] = email.split('@')
  if (!domain || !domain.includes('.')) return false
  return true
}

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return null

    return await response.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

interface ExtractResult {
  emails: string[]
  phones: string[]
  title: string
}

function parseHtml(html: string): ExtractResult {
  const $ = cheerio.load(html)

  $('script, style, noscript, head').remove()

  const text = $.text()

  const emailsFromText = Array.from(new Set(text.match(EMAIL_REGEX) ?? []))

  const emailsFromLinks: string[] = []
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const email = href.replace('mailto:', '').split('?')[0].trim()
    if (email) emailsFromLinks.push(email)
  })

  const phones = Array.from(new Set(text.match(PHONE_REGEX_BR) ?? []))
    .filter((p) => p.replace(/\D/g, '').length >= 10)
    .slice(0, 5)

  const allEmails = Array.from(new Set([...emailsFromLinks, ...emailsFromText]))
    .filter(isValidEmail)
    .slice(0, 10)

  return {
    emails: allEmails,
    phones,
    title: $('title').text().trim(),
  }
}

const CONTACT_PATHS = [
  '/contato', '/contact', '/fale-conosco', '/fale-com-a-gente',
  '/sobre', '/about', '/quem-somos',
]

export async function extractEmailsFromUrl(rawUrl: string): Promise<ExtractResult> {
  const html = await fetchHtml(rawUrl)

  if (!html) return { emails: [], phones: [], title: '' }

  const result = parseHtml(html)

  if (result.emails.length > 0) return result

  // Fallback: try common contact pages
  try {
    const origin = new URL(rawUrl).origin

    for (const path of CONTACT_PATHS) {
      const contactHtml = await fetchHtml(`${origin}${path}`, 5000)
      if (!contactHtml) continue

      const contactResult = parseHtml(contactHtml)
      if (contactResult.emails.length > 0) {
        return {
          emails: contactResult.emails,
          phones: contactResult.phones.length > 0 ? contactResult.phones : result.phones,
          title: result.title,
        }
      }
    }
  } catch {
    // URL parsing failed — return what we have
  }

  return result
}
