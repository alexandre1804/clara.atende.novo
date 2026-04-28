import { NextRequest, NextResponse } from 'next/server'
import { extractEmailsFromUrl } from '@/lib/email-extractor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url?: unknown }
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'O campo url é obrigatório' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(String(url))
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Protocolo não permitido' }, { status: 400 })
    }

    const result = await extractEmailsFromUrl(parsedUrl.toString())
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao extrair emails'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
