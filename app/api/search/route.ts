import { NextRequest, NextResponse } from 'next/server'
import { searchGoogle } from '@/lib/google-search'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { query?: unknown; location?: unknown; num?: unknown }
    const { query, location, num } = body

    if (!query || !location) {
      return NextResponse.json(
        { error: 'Os campos query e location são obrigatórios' },
        { status: 400 }
      )
    }

    const results = await searchGoogle(
      String(query).trim(),
      String(location).trim(),
      Number(num) || 10
    )

    return NextResponse.json({ results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar no Google'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
