import type OpenAI from 'openai'
import { db } from './db'

// ─── Type helpers ────────────────────────────────────────────────────────────

export type ToolResult = { success: boolean; data?: unknown; error?: string }

// ─── OpenAI tool definitions ─────────────────────────────────────────────────

export const TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_clinic_info',
      description: 'Retorna informações da clínica: serviços, profissionais e horários disponíveis. Use no início da conversa para contextualizar.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description: 'Retorna os horários livres para agendamento em uma data específica.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Data no formato YYYY-MM-DD. Use a data solicitada pelo paciente.',
          },
          professional_id: {
            type: 'string',
            description: 'ID do profissional (opcional). Se não informado, retorna horários de todos.',
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_patient',
      description: 'Busca um paciente cadastrado pelo número de telefone.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Número de telefone com DDD, apenas dígitos.' },
        },
        required: ['phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_appointments',
      description: 'Lista os próximos agendamentos de um paciente pelo telefone.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Telefone do paciente, apenas dígitos.' },
        },
        required: ['phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description: 'Cria um novo agendamento. Confirme todos os dados com o paciente antes de chamar esta função.',
      parameters: {
        type: 'object',
        properties: {
          patient_phone:    { type: 'string', description: 'Telefone do paciente, apenas dígitos.' },
          patient_name:     { type: 'string', description: 'Nome completo do paciente (necessário se não cadastrado).' },
          service:          { type: 'string', description: 'Nome do serviço ou procedimento.' },
          date:             { type: 'string', description: 'Data no formato YYYY-MM-DD.' },
          time:             { type: 'string', description: 'Horário no formato HH:MM.' },
          professional_id:  { type: 'string', description: 'ID do profissional (opcional).' },
          duration_minutes: { type: 'number', description: 'Duração em minutos (padrão 30).' },
          notes:            { type: 'string', description: 'Observações adicionais (opcional).' },
        },
        required: ['patient_phone', 'patient_name', 'service', 'date', 'time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_appointment',
      description: 'Remarca um agendamento existente para nova data e horário.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'ID do agendamento a remarcar.' },
          new_date:       { type: 'string', description: 'Nova data no formato YYYY-MM-DD.' },
          new_time:       { type: 'string', description: 'Novo horário no formato HH:MM.' },
        },
        required: ['appointment_id', 'new_date', 'new_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description: 'Cancela um agendamento. Confirme com o paciente antes de executar.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'ID do agendamento a cancelar.' },
          reason:         { type: 'string', description: 'Motivo do cancelamento (opcional).' },
        },
        required: ['appointment_id'],
      },
    },
  },
]

// ─── Tool execution ───────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  clinicId: string,
  autoBooking: boolean,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'get_clinic_info':
        return getClinicInfo(clinicId)

      case 'get_available_slots':
        return getAvailableSlots(clinicId, args.date as string, args.professional_id as string | undefined)

      case 'find_patient':
        return findPatient(clinicId, args.phone as string)

      case 'get_patient_appointments':
        return getPatientAppointments(clinicId, args.phone as string)

      case 'create_appointment':
        if (!autoBooking) return { success: false, error: 'Agendamento automático desativado. O paciente deve ligar ou usar o sistema.' }
        return createAppointment(clinicId, args)

      case 'reschedule_appointment':
        if (!autoBooking) return { success: false, error: 'Remarcação automática desativada. O paciente deve ligar ou usar o sistema.' }
        return rescheduleAppointment(clinicId, args.appointment_id as string, args.new_date as string, args.new_time as string)

      case 'cancel_appointment':
        if (!autoBooking) return { success: false, error: 'Cancelamento automático desativado. O paciente deve ligar ou usar o sistema.' }
        return cancelAppointment(clinicId, args.appointment_id as string)

      default:
        return { success: false, error: `Ferramenta desconhecida: ${name}` }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Implementations ──────────────────────────────────────────────────────────

async function getClinicInfo(clinicId: string): Promise<ToolResult> {
  const [{ data: clinic }, { data: services }, { data: professionals }] = await Promise.all([
    db.from('clinics').select('name, phone, email, address').eq('id', clinicId).single(),
    db.from('services').select('name, duration_minutes, price, category').eq('clinic_id', clinicId).eq('is_active', true).order('name'),
    db.from('professionals').select('id, name, specialty').eq('clinic_id', clinicId).eq('is_active', true).order('name'),
  ])
  return { success: true, data: { clinic, services, professionals } }
}

async function getAvailableSlots(clinicId: string, date: string, professionalId?: string): Promise<ToolResult> {
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay()

  const availQuery = db.from('availability').select('*').eq('clinic_id', clinicId).eq('day_of_week', dayOfWeek)
  if (professionalId) availQuery.eq('professional_id', professionalId)
  const { data: avail } = await availQuery

  if (!avail || avail.length === 0) return { success: true, data: { date, slots: [] } }

  const startOfDay = `${date}T00:00:00`
  const endOfDay   = `${date}T23:59:59`

  const aptQuery = db.from('appointments')
    .select('start_datetime, end_datetime, professional_id')
    .eq('clinic_id', clinicId)
    .gte('start_datetime', startOfDay)
    .lte('start_datetime', endOfDay)
    .not('status', 'eq', 'cancelled')
  if (professionalId) aptQuery.eq('professional_id', professionalId)

  const blockQuery = db.from('schedule_blocks')
    .select('start_datetime, end_datetime, professional_id')
    .eq('clinic_id', clinicId)
    .lte('start_datetime', endOfDay)
    .gte('end_datetime', startOfDay)
  if (professionalId) blockQuery.eq('professional_id', professionalId)

  const [{ data: existing }, { data: blocks }] = await Promise.all([aptQuery, blockQuery])
  const busy = [...(existing ?? []), ...(blocks ?? [])]

  const slots: string[] = []
  for (const rule of avail) {
    const [sh, sm] = (rule.start_time as string).split(':').map(Number)
    const [eh, em] = (rule.end_time   as string).split(':').map(Number)
    const duration = (rule.slot_duration as number | null) ?? 30

    let ch = sh, cm = sm
    while (ch * 60 + cm + duration <= eh * 60 + em) {
      const slotIso  = `${date}T${String(ch).padStart(2,'0')}:${String(cm).padStart(2,'0')}:00`
      const slotEnd  = new Date(new Date(slotIso).getTime() + duration * 60_000).toISOString()

      const conflict = busy.some((b) => {
        const bs = new Date(b.start_datetime as string).getTime()
        const be = new Date(b.end_datetime   as string).getTime()
        const ss = new Date(slotIso).getTime()
        const se = new Date(slotEnd).getTime()
        return ss < be && se > bs
      })

      if (!conflict) slots.push(`${String(ch).padStart(2,'0')}:${String(cm).padStart(2,'0')}`)

      cm += duration
      while (cm >= 60) { cm -= 60; ch++ }
    }
  }

  const unique = [...new Set(slots)].sort()
  return { success: true, data: { date, slots: unique } }
}

async function findPatient(clinicId: string, phone: string): Promise<ToolResult> {
  const digits = phone.replace(/\D/g, '')
  const { data } = await db.from('patients').select('id, full_name, phone, insurance')
    .eq('clinic_id', clinicId).eq('phone', digits).maybeSingle()
  return { success: true, data: data ?? null }
}

async function getPatientAppointments(clinicId: string, phone: string): Promise<ToolResult> {
  const digits = phone.replace(/\D/g, '')
  const { data: patient } = await db.from('patients').select('id')
    .eq('clinic_id', clinicId).eq('phone', digits).maybeSingle()
  if (!patient) return { success: true, data: [] }

  const { data } = await db.from('appointments')
    .select('id, service, start_datetime, end_datetime, status, professional:professionals(name)')
    .eq('clinic_id', clinicId)
    .eq('patient_id', (patient as { id: string }).id)
    .gte('start_datetime', new Date().toISOString())
    .not('status', 'eq', 'cancelled')
    .order('start_datetime')
    .limit(5)
  return { success: true, data: data ?? [] }
}

async function createAppointment(clinicId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const phone    = (args.patient_phone as string).replace(/\D/g, '')
  const name     = args.patient_name as string
  const service  = args.service as string
  const date     = args.date as string
  const time     = args.time as string
  const profId   = args.professional_id as string | undefined
  const duration = (args.duration_minutes as number | undefined) ?? 30
  const notes    = args.notes as string | undefined

  // Find or create patient
  let { data: patient } = await db.from('patients').select('id')
    .eq('clinic_id', clinicId).eq('phone', phone).maybeSingle()

  if (!patient) {
    const { data: newP, error } = await db.from('patients')
      .insert({ clinic_id: clinicId, full_name: name, phone })
      .select('id').single()
    if (error) return { success: false, error: error.message }
    patient = newP
  }

  // Choose professional: use provided, or first active
  let professionalId = profId
  if (!professionalId) {
    const { data: prof } = await db.from('professionals')
      .select('id').eq('clinic_id', clinicId).eq('is_active', true).limit(1).single()
    if (!prof) return { success: false, error: 'Nenhum profissional disponível.' }
    professionalId = (prof as { id: string }).id
  }

  const startDt = new Date(`${date}T${time}:00`)
  const endDt   = new Date(startDt.getTime() + duration * 60_000)

  const { data: appt, error } = await db.from('appointments').insert({
    clinic_id:       clinicId,
    patient_id:      (patient as { id: string }).id,
    professional_id: professionalId,
    service,
    start_datetime:  startDt.toISOString(),
    end_datetime:    endDt.toISOString(),
    status:          'scheduled',
    notes:           notes ?? null,
    source:          'whatsapp',
  }).select('id').single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: { appointment_id: (appt as { id: string }).id, date, time, service } }
}

async function rescheduleAppointment(clinicId: string, appointmentId: string, newDate: string, newTime: string): Promise<ToolResult> {
  const { data: appt } = await db.from('appointments').select('end_datetime, start_datetime')
    .eq('id', appointmentId).eq('clinic_id', clinicId).single()
  if (!appt) return { success: false, error: 'Agendamento não encontrado.' }

  const duration = new Date((appt as { end_datetime: string }).end_datetime).getTime() -
                   new Date((appt as { start_datetime: string }).start_datetime).getTime()
  const startDt  = new Date(`${newDate}T${newTime}:00`)
  const endDt    = new Date(startDt.getTime() + duration)

  const { error } = await db.from('appointments').update({
    start_datetime: startDt.toISOString(),
    end_datetime:   endDt.toISOString(),
    status:         'scheduled',
  }).eq('id', appointmentId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: { appointment_id: appointmentId, new_date: newDate, new_time: newTime } }
}

async function cancelAppointment(clinicId: string, appointmentId: string): Promise<ToolResult> {
  const { error } = await db.from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('clinic_id', clinicId)
  if (error) return { success: false, error: error.message }
  return { success: true, data: { cancelled: true } }
}
