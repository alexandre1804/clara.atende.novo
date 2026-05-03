const BASE = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const KEY  = process.env.EVOLUTION_API_KEY ?? ''

function headers() {
  return { 'Content-Type': 'application/json', apikey: KEY }
}

export async function sendTextMessage(instance: string, phone: string, text: string) {
  const number = phone.replace(/\D/g, '')
  const res = await fetch(`${BASE}/message/sendText/${instance}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ number, text }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Evolution sendText failed: ${err}`)
  }
}

export async function createInstance(instanceName: string, webhookUrl: string) {
  const res = await fetch(`${BASE}/instance/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url:              webhookUrl,
        byEvents:         true,
        base64:           false,
        events:           ['MESSAGES_UPSERT'],
      },
      rejectCall:       true,
      msgCall:          'Não atendemos chamadas por aqui. Envie uma mensagem.',
      groupsIgnore:     true,
      alwaysOnline:     true,
      readMessages:     true,
      readStatus:       false,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Evolution createInstance failed: ${err}`)
  }
  return res.json() as Promise<{ instance: { instanceName: string } }>
}

export async function getQrCode(instanceName: string) {
  const res = await fetch(`${BASE}/instance/connect/${instanceName}`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Evolution getQr failed: ${res.status}`)
  return res.json() as Promise<{ base64?: string; code?: string; pairingCode?: string }>
}

export async function getConnectionState(instanceName: string) {
  const res = await fetch(`${BASE}/instance/connectionState/${instanceName}`, {
    headers: headers(),
  })
  if (!res.ok) return { state: 'disconnected' as const }
  const data = await res.json() as { instance?: { state?: string } }
  return { state: data?.instance?.state ?? 'disconnected' }
}

export async function setTyping(instance: string, phone: string) {
  const number = phone.replace(/\D/g, '')
  await fetch(`${BASE}/chat/sendPresence/${instance}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ number, presence: 'composing', delay: 1200 }),
  }).catch(() => {}) // ignore failures — typing indicator is cosmetic
}
