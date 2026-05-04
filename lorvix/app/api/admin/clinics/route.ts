import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

const EVOLUTION_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? ''
const AGENT_WEBHOOK = (process.env.AGENT_WEBHOOK_URL ?? '').replace(/\/$/, '')

function evoHeaders() {
  return { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY }
}

async function createEvolutionInstance(instanceName: string): Promise<void> {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) return

  const webhookUrl = AGENT_WEBHOOK ? `${AGENT_WEBHOOK}/webhook` : ''

  await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers: evoHeaders(),
    body: JSON.stringify({
      instanceName,
      integration:  'WHATSAPP-BAILEYS',
      rejectCall:   true,
      msgCall:      'Não atendemos chamadas por aqui. Envie uma mensagem.',
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      readStatus:   false,
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
  // Failure is non-fatal — clinic is created regardless; WhatsApp can be connected later
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { name, slug, plan, ownerName, ownerEmail, ownerPassword } = await req.json() as {
    name: string; slug: string; plan: string
    ownerName: string; ownerEmail: string; ownerPassword: string
  }

  if (!name || !slug || !ownerEmail || !ownerPassword) {
    return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
  }

  const slugClean    = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const instanceName = `clinic-${slugClean}`
  const admin        = createAdminClient()

  // Check slug uniqueness
  const { data: existing } = await admin.from('clinics').select('id').eq('slug', slugClean).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Slug já está em uso.' }, { status: 409 })

  // Create clinic
  const { data: clinic, error: clinicErr } = await admin.from('clinics').insert({
    name,
    slug:            slugClean,
    plan:            plan ?? 'pro',
    is_active:       true,
    primary_color:   '#5C0018',
    secondary_color: '#9B1040',
  }).select().single()

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: 'Erro ao criar clínica: ' + clinicErr?.message }, { status: 500 })
  }

  // Create auth user
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email:         ownerEmail,
    password:      ownerPassword,
    email_confirm: true,
    user_metadata: { full_name: ownerName },
  })

  if (authErr || !authUser.user) {
    await admin.from('clinics').delete().eq('id', clinic.id)
    return NextResponse.json({ error: 'Erro ao criar usuário: ' + authErr?.message }, { status: 500 })
  }

  // Create clinic_user
  const { error: userErr } = await admin.from('clinic_users').insert({
    id:        authUser.user.id,
    clinic_id: clinic.id,
    full_name: ownerName,
    email:     ownerEmail,
    role:      'owner',
  })

  if (userErr) {
    await admin.auth.admin.deleteUser(authUser.user.id)
    await admin.from('clinics').delete().eq('id', clinic.id)
    return NextResponse.json({ error: 'Erro ao vincular usuário: ' + userErr.message }, { status: 500 })
  }

  // Create WhatsApp config + Evolution instance (non-fatal)
  const [{ error: waErr }] = await Promise.all([
    admin.from('whatsapp_config').insert({
      clinic_id:             clinic.id,
      instance_name:         instanceName,
      api_url:               EVOLUTION_URL || null,
      agent_name:            `Assistente ${name}`,
      agent_instructions:    '',
      is_active:             false,
      auto_booking:          false,
    }),
    createEvolutionInstance(instanceName),
  ])

  if (waErr) {
    console.warn('[admin/clinics] whatsapp_config insert failed:', waErr.message)
  }

  return NextResponse.json({
    ok:           true,
    slug:         slugClean,
    clinicId:     clinic.id,
    instanceName,
    whatsappReady: !waErr,
  })
}
