import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth }       from '@/lib/auth'

export const dynamic = 'force-dynamic'

const EVOLUTION_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? ''
const AGENT_WEBHOOK = (process.env.AGENT_WEBHOOK_URL ?? '').replace(/\/$/, '')

function evoHeaders() {
  return { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY }
}

async function ensureInstance(instanceName: string): Promise<boolean> {
  const check = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
    headers: evoHeaders(),
  })
  if (check.ok) return true

  const webhookUrl = AGENT_WEBHOOK ? `${AGENT_WEBHOOK}/webhook` : ''
  const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers: evoHeaders(),
    body: JSON.stringify({
      instanceName,
      integration:  'WHATSAPP-BAILEYS',
      rejectCall:   true,
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      ...(webhookUrl && {
        webhook: {
          url:      webhookUrl,
          byEvents: true,
          base64:   false,
          events:   ['MESSAGES_UPSERT'],
        },
      }),
    }),
  })
  return res.ok
}

export async function GET() {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    return NextResponse.json({ error: 'Evolution API não configurada na VPS.' }, { status: 503 })
  }

  try {
    const { user } = await requireAuth()
    const supabase  = await createClient()
    const admin     = createAdminClient()

    const { data: clinic } = await supabase
      .from('clinics').select('slug, name').eq('id', user.clinic_id).single()
    if (!clinic) return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 })

    // Auto-create whatsapp_config if it's the first time
    let { data: config } = await supabase
      .from('whatsapp_config').select('*').eq('clinic_id', user.clinic_id).single()

    if (!config) {
      const instanceName = `clinic-${(clinic as { slug: string }).slug}`
      const { data: created } = await admin.from('whatsapp_config').insert({
        clinic_id:     user.clinic_id,
        instance_name: instanceName,
        api_url:       EVOLUTION_URL,
        agent_name:    `Assistente ${(clinic as { name: string }).name}`,
        is_active:     false,
        auto_booking:  false,
      }).select().single()
      config = created
    }

    if (!config) return NextResponse.json({ error: 'Erro ao criar configuração WhatsApp.' }, { status: 500 })

    const instanceName = (config as { instance_name: string }).instance_name
    await ensureInstance(instanceName)

    const qrRes = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
      headers: evoHeaders(),
    })
    if (!qrRes.ok) {
      return NextResponse.json({ error: 'Erro ao obter QR code.' }, { status: 502 })
    }

    const qrData = await qrRes.json() as { base64?: string; code?: string; pairingCode?: string }
    return NextResponse.json({
      base64:      qrData.base64      ?? null,
      pairingCode: qrData.pairingCode ?? qrData.code ?? null,
    })
  } catch (err) {
    console.error('[whatsapp/qr]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
