export type UserRole = 'owner' | 'receptionist' | 'doctor'
export type ClinicPlan = 'basic' | 'pro' | 'enterprise'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type AppointmentSource = 'manual' | 'online' | 'whatsapp'
export type FinancialType = 'income' | 'expense'
export type NotificationType = 'confirmation' | 'reminder' | 'cancellation' | 'follow_up'
export type NotificationChannel = 'whatsapp' | 'email' | 'sms'

export interface Clinic {
  id: string
  name: string
  slug: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  bg_color?: string | null
  phone?: string
  email?: string
  address?: string
  plan: ClinicPlan
  is_active: boolean
  stripe_customer_id?: string
  stripe_subscription_id?: string
  created_at: string
}

export interface ClinicUser {
  id: string
  clinic_id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  created_at: string
}

export interface Professional {
  id: string
  clinic_id: string
  name: string
  specialty: string
  bio?: string
  avatar_url?: string
  phone?: string
  email?: string
  color: string
  is_active: boolean
  created_at: string
}

export interface Availability {
  id: string
  clinic_id: string
  professional_id: string
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6
  start_time: string
  end_time: string
  slot_duration: number
}

export interface ScheduleBlock {
  id: string
  clinic_id: string
  professional_id: string
  start_datetime: string
  end_datetime: string
  reason: string
  created_at: string
}

export interface Patient {
  id: string
  clinic_id: string
  full_name: string
  cpf?: string
  phone: string
  email?: string
  birth_date?: string
  address?: string
  insurance?: string
  notes?: string
  created_at: string
}

export interface Appointment {
  id: string
  clinic_id: string
  patient_id: string
  professional_id: string
  service: string
  start_datetime: string
  end_datetime: string
  status: AppointmentStatus
  notes?: string
  price?: number
  source: AppointmentSource
  created_at: string
  patient?: Patient
  professional?: Professional
}

export interface FinancialRecord {
  id: string
  clinic_id: string
  appointment_id?: string
  type: FinancialType
  description: string
  amount: number
  date: string
  category: string
  created_at: string
}

export interface NotificationTemplate {
  id: string
  clinic_id: string
  type: NotificationType
  channel: NotificationChannel
  body: string
  is_active: boolean
}

export interface WhatsappConfig {
  id: string
  clinic_id: string
  instance_name: string
  api_url: string
  agent_name: string
  agent_instructions?: string
  is_active: boolean
  created_at: string
}

export interface WhatsappConversation {
  id: string
  clinic_id: string
  phone: string
  patient_id?: string
  messages: WhatsappMessage[]
  last_message_at: string
  created_at: string
}

export interface WhatsappMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AuditLog {
  id: string
  clinic_id: string
  user_id?: string
  action: string
  table_name: string
  record_id?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  ip_address?: string
  created_at: string
}
