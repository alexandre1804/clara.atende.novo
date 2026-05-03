import { db } from './db'
import { sendTextMessage } from './evolution'

// Keeps track of reminders already sent in this process lifetime.
// Uses appointment_id + type as key to avoid duplicate sends.
const sentReminders = new Set<string>()

interface Appointment {
  id:             string
  clinic_id:      string
  service:        string
  start_datetime: string
  patient: {
    full_name: string
    phone:     string
  } | null
  professional: {
    name: string
  } | null
}

interface WhatsappConfig {
  instance_name: string
  is_active:     boolean
}

export async function runReminders() {
  const now = new Date()

  // Look 3 days ahead to catch all pending appointments
  const windowEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const { data: appointments } = await db
    .from('appointments')
    .select('id, clinic_id, service, start_datetime, patient:patients(full_name, phone), professional:professionals(name)')
    .gte('start_datetime', now.toISOString())
    .lte('start_datetime', windowEnd.toISOString())
    .in('status', ['scheduled', 'confirmed'])

  if (!appointments || appointments.length === 0) return

  for (const raw of appointments) {
    const appt = raw as unknown as Appointment
    if (!appt.patient?.phone) continue

    const start   = new Date(appt.start_datetime)
    const diffMs  = start.getTime() - now.getTime()
    const diffMin = diffMs / 60_000

    // 24h reminder: window 23h30 – 24h30 (30-min cron won't double-send)
    if (diffMin >= 23.5 * 60 && diffMin <= 24.5 * 60) {
      await maybeSendReminder(appt, '24h')
    }

    // 1h reminder: window 55 – 65 minutes
    if (diffMin >= 55 && diffMin <= 65) {
      await maybeSendReminder(appt, '1h')
    }
  }
}

async function maybeSendReminder(appt: Appointment, type: '24h' | '1h') {
  const key = `${appt.id}:${type}`
  if (sentReminders.has(key)) return

  // Find active whatsapp_config for this clinic
  const { data: config } = await db
    .from('whatsapp_config')
    .select('instance_name, is_active')
    .eq('clinic_id', appt.clinic_id)
    .single()

  if (!config || !(config as WhatsappConfig).is_active) return

  const instanceName = (config as WhatsappConfig).instance_name

  // Fetch notification template if exists
  const { data: template } = await db
    .from('notification_templates')
    .select('body')
    .eq('clinic_id', appt.clinic_id)
    .eq('type', 'reminder')
    .eq('channel', 'whatsapp')
    .eq('is_active', true)
    .maybeSingle()

  const start    = new Date(appt.start_datetime)
  const dateStr  = start.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })
  const timeStr  = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  const profName = appt.professional?.name ?? ''

  let message: string
  if (template?.body) {
    message = (template.body as string)
      .replace(/{nome}/g,          appt.patient?.full_name ?? 'Paciente')
      .replace(/{data}/g,          dateStr)
      .replace(/{hora}/g,          timeStr)
      .replace(/{profissional}/g,  profName)
      .replace(/{servico}/g,       appt.service)
  } else {
    const when = type === '24h' ? 'amanhã' : 'em 1 hora'
    message = `Olá, ${appt.patient?.full_name ?? 'paciente'}! 👋\n\nLembramos que você tem um agendamento *${when}*:\n\n📅 ${dateStr}\n🕐 ${timeStr}\n💼 ${appt.service}${profName ? `\n👨‍⚕️ ${profName}` : ''}\n\nQualquer dúvida é só responder aqui. Até logo!`
  }

  try {
    await sendTextMessage(instanceName, appt.patient!.phone, message)
    sentReminders.add(key)
    console.log(`[reminder] Sent ${type} reminder for appointment ${appt.id}`)
  } catch (err) {
    console.error(`[reminder] Failed to send reminder for ${appt.id}:`, err)
  }
}
