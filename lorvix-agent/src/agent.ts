import OpenAI from 'openai'
import { db } from './db'
import { sendTextMessage, setTyping } from './evolution'
import { TOOL_DEFINITIONS, executeTool } from './tools'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MODEL  = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

// Max conversation turns kept in context (older are pruned)
const MAX_HISTORY = 30

// ─── Webhook payload (Evolution API v2) ──────────────────────────────────────

interface EvolutionPayload {
  event:    string
  instance: string
  data?: {
    key?: {
      remoteJid?: string
      fromMe?:    boolean
      id?:        string
    }
    pushName?: string
    message?: {
      conversation?:        string
      extendedTextMessage?: { text?: string }
      imageMessage?:        { caption?: string }
      videoMessage?:        { caption?: string }
    }
    messageType?: string
  }
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export async function handleIncoming(payload: EvolutionPayload) {
  if (payload.event !== 'messages.upsert') return
  if (!payload.data?.key) return
  if (payload.data.key.fromMe) return                         // ignore own messages

  const instanceName = payload.instance
  const remoteJid    = payload.data.key.remoteJid ?? ''
  if (!remoteJid.endsWith('@s.whatsapp.net')) return          // ignore groups

  const phone      = remoteJid.replace('@s.whatsapp.net', '')
  const senderName = payload.data.pushName ?? ''
  const text       = extractText(payload)
  if (!text?.trim()) return

  // ── 1. Resolve clinic ────────────────────────────────────────────────────
  const { data: config, error: cfgErr } = await db
    .from('whatsapp_config')
    .select('clinic_id, is_active, auto_booking, agent_instructions')
    .eq('instance_name', instanceName)
    .single()

  if (cfgErr || !config) {
    console.warn(`[agent] No config for instance "${instanceName}"`)
    return
  }
  if (!config.is_active) return                               // automation disabled

  const clinicId   = config.clinic_id as string
  const autoBook   = Boolean(config.auto_booking)
  const customInst = (config.agent_instructions as string | null) ?? ''

  // ── 2. Load clinic info (for system prompt) ──────────────────────────────
  const { data: clinic } = await db
    .from('clinics')
    .select('name, phone, address')
    .eq('id', clinicId)
    .single()

  // ── 3. Load / create conversation ────────────────────────────────────────
  const { data: conv } = await db
    .from('whatsapp_conversations')
    .select('id, messages')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .maybeSingle()

  type Message = { role: string; content: string; timestamp: string }
  const history: Message[] = ((conv?.messages as Message[] | null) ?? []).slice(-MAX_HISTORY)

  // ── 4. Append user message ────────────────────────────────────────────────
  history.push({ role: 'user', content: text, timestamp: new Date().toISOString() })

  // ── 5. Show typing indicator ──────────────────────────────────────────────
  await setTyping(instanceName, phone)

  // ── 6. Run AI agent ───────────────────────────────────────────────────────
  const now     = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  })
  const systemPrompt = buildSystemPrompt(clinic?.name ?? 'Clínica', now, senderName, customInst, autoBook)

  const reply = await runAgentLoop(systemPrompt, history, clinicId, autoBook)

  // ── 7. Send response ──────────────────────────────────────────────────────
  await sendTextMessage(instanceName, phone, reply)

  // ── 8. Save conversation ──────────────────────────────────────────────────
  history.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() })

  if (conv?.id) {
    await db.from('whatsapp_conversations').update({
      messages:        history.slice(-MAX_HISTORY),
      last_message_at: new Date().toISOString(),
    }).eq('id', conv.id)
  } else {
    await db.from('whatsapp_conversations').insert({
      clinic_id:       clinicId,
      phone,
      messages:        history,
      last_message_at: new Date().toISOString(),
    })
  }
}

// ─── AI agent loop (handles multi-step tool calls) ───────────────────────────

async function runAgentLoop(
  systemPrompt: string,
  history: { role: string; content: string }[],
  clinicId: string,
  autoBooking: boolean,
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  // Allow up to 8 tool-call rounds to prevent infinite loops
  for (let round = 0; round < 8; round++) {
    const response = await openai.chat.completions.create({
      model:       MODEL,
      messages,
      tools:       TOOL_DEFINITIONS,
      tool_choice: 'auto',
      max_tokens:  1024,
      temperature: 0.4,
    })

    const choice = response.choices[0]
    if (!choice) break

    // No tool calls — return final text
    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls) {
      return choice.message.content ?? 'Desculpe, não consegui processar sua mensagem.'
    }

    // Process tool calls
    messages.push(choice.message)

    for (const tc of choice.message.tool_calls) {
      let args: Record<string, unknown> = {}
      try { args = JSON.parse(tc.function.arguments) } catch { /* empty args */ }

      const result = await executeTool(tc.function.name, args, clinicId, autoBooking)

      messages.push({
        role:         'tool',
        tool_call_id: tc.id,
        content:      JSON.stringify(result),
      })
    }
  }

  return 'Desculpe, não consegui completar a operação. Por favor, entre em contato diretamente com a clínica.'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractText(payload: EvolutionPayload): string | null {
  const msg = payload.data?.message
  if (!msg) return null
  return (
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    null
  )
}

function buildSystemPrompt(
  clinicName: string,
  today: string,
  senderName: string,
  customInstructions: string,
  autoBooking: boolean,
): string {
  const bookingNote = autoBooking
    ? 'Você PODE criar, remarcar e cancelar agendamentos automaticamente usando as ferramentas disponíveis. Sempre confirme os dados antes de executar.'
    : 'O agendamento automático está DESATIVADO. Você pode consultar disponibilidade e informações, mas NÃO pode criar, remarcar ou cancelar agendamentos. Informe o paciente que ele deve ligar ou acessar o sistema para agendar.'

  const base = `Você é a assistente virtual da ${clinicName}, respondendo via WhatsApp.
Data atual: ${today}.
${senderName ? `O paciente se chama ${senderName}.` : ''}

REGRAS:
- Responda SEMPRE em português brasileiro.
- Seja cordial, objetivo e profissional. Sem emojis em excesso.
- Nunca invente informações. Use as ferramentas para buscar dados reais.
- Quando consultar disponibilidade, apresente os horários de forma organizada.
- Antes de agendar, confirme: serviço, profissional (se houver), data e horário.
- Nunca compartilhe dados de outros pacientes.
- ${bookingNote}

FLUXO DE AGENDAMENTO:
1. Entenda o que o paciente precisa.
2. Consulte informações da clínica se necessário (get_clinic_info).
3. Verifique disponibilidade (get_available_slots).
4. Confirme os dados com o paciente.
5. Execute a ação (create_appointment).
6. Confirme o agendamento com data, hora e serviço.`

  return customInstructions
    ? `${base}\n\nINSTRUÇÕES ADICIONAIS DA CLÍNICA:\n${customInstructions}`
    : base
}
