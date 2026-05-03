import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/clinic/whatsapp/qr
// Busca o QR code no Evolution API. Se a instância não existir, cria primeiro.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('id', user.id)
    .single()
  if (!clinicUser) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { data: waConfig } = await supabase
    .from('whatsapp_config')
    .select('instance_name, api_url')
    .eq('clinic_id', clinicUser.clinic_id)
    .single()

  if (!waConfig?.api_url || !waConfig?.instance_name) {
    return NextResponse.json(
      { error: 'Configure a URL da API e o nome da instância primeiro.' },
      { status: 400 },
    )
  }

  const apiKey = process.env.EVOLUTION_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'EVOLUTION_API_KEY não configurada no servidor.' },
      { status: 500 },
    )
  }

  const headers = { apikey: apiKey, 'Content-Type': 'application/json' }

  // Tenta buscar QR da instância existente
  let qrRes = await fetch(
    `${waConfig.api_url}/instance/connect/${waConfig.instance_name}`,
    { headers, cache: 'no-store' },
  ).catch(() => null)

  // Se instância não existe (404), cria e tenta novamente
  if (!qrRes || qrRes.status === 404) {
    const createRes = await fetch(`${waConfig.api_url}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instanceName: waConfig.instance_name,
        qrcode:       true,
        integration:  'WHATSAPP-BAILEYS',
      }),
    }).catch(() => null)

    if (!createRes?.ok) {
      return NextResponse.json(
        { error: 'Não foi possível criar a instância no Evolution API.' },
        { status: 502 },
      )
    }

    // Aguarda um momento e busca o QR
    await new Promise((r) => setTimeout(r, 1500))
    qrRes = await fetch(
      `${waConfig.api_url}/instance/connect/${waConfig.instance_name}`,
      { headers, cache: 'no-store' },
    ).catch(() => null)
  }

  if (!qrRes?.ok) {
    return NextResponse.json(
      { error: 'Não foi possível obter o QR code. Verifique a URL do Evolution API.' },
      { status: 502 },
    )
  }

  const data = await qrRes.json()

  return NextResponse.json({
    base64:      data.base64 ?? null,       // "data:image/png;base64,..."
    code:        data.code ?? null,          // string do QR (fallback)
    pairingCode: data.pairingCode ?? null,   // código de pareamento (alternativa ao QR)
  })
}
