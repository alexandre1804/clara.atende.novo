'use client'

import { useState, useTransition } from 'react'
import { X, Save, Trash2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn, formatDate } from '@/lib/utils'
import type { Appointment, Professional, AppointmentStatus, Patient } from '@/types'

const STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: 'scheduled',  label: 'Agendado' },
  { value: 'confirmed',  label: 'Confirmado' },
  { value: 'completed',  label: 'Concluído' },
  { value: 'cancelled',  label: 'Cancelado' },
  { value: 'no_show',    label: 'Não compareceu' },
]

interface Props {
  appointment: Appointment | null
  professionals: Professional[]
  clinicId: string
  defaultDate?: Date
  defaultHour?: number
  onClose: () => void
}

export function AppointmentModal({
  appointment, professionals, clinicId, defaultDate, defaultHour, onClose,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const defaultDateStr = defaultDate
    ? defaultDate.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const defaultTimeStr = defaultHour != null
    ? `${String(defaultHour).padStart(2, '0')}:00`
    : '09:00'

  const [form, setForm] = useState({
    service:        appointment?.service ?? '',
    professional_id: appointment?.professional_id ?? (professionals[0]?.id ?? ''),
    date:           appointment ? new Date(appointment.start_datetime).toISOString().slice(0, 10) : defaultDateStr,
    time:           appointment ? new Date(appointment.start_datetime).toTimeString().slice(0, 5) : defaultTimeStr,
    duration:       appointment
      ? Math.round((new Date(appointment.end_datetime).getTime() - new Date(appointment.start_datetime).getTime()) / 60000)
      : 30,
    status:         (appointment?.status ?? 'scheduled') as AppointmentStatus,
    notes:          appointment?.notes ?? '',
    price:          appointment?.price ?? '',
    patientPhone:   '',
    patientName:    (appointment?.patient as Patient | undefined)?.full_name ?? '',
    patientId:      appointment?.patient_id ?? '',
  })
  const [patientSearch, setPatientSearch] = useState('')
  const [foundPatient, setFoundPatient] = useState<Patient | null>(
    appointment?.patient ? (appointment.patient as Patient) : null,
  )
  const [searchError, setSearchError] = useState('')

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function searchPatient() {
    if (!patientSearch) return
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .or(`phone.eq.${patientSearch},cpf.eq.${patientSearch}`)
      .single()
    if (data) {
      setFoundPatient(data as Patient)
      setForm((prev) => ({ ...prev, patientId: data.id, patientName: data.full_name }))
      setSearchError('')
    } else {
      setSearchError('Paciente não encontrado.')
    }
  }

  function handleSave() {
    startTransition(async () => {
      const startDt = new Date(`${form.date}T${form.time}:00`)
      const endDt = new Date(startDt.getTime() + form.duration * 60000)

      const payload = {
        clinic_id:       clinicId,
        patient_id:      form.patientId || null,
        professional_id: form.professional_id,
        service:         form.service,
        start_datetime:  startDt.toISOString(),
        end_datetime:    endDt.toISOString(),
        status:          form.status,
        notes:           form.notes || null,
        price:           form.price !== '' ? Number(form.price) : null,
      }

      if (appointment) {
        await supabase.from('appointments').update(payload).eq('id', appointment.id)
      } else {
        await supabase.from('appointments').insert(payload)
      }

      router.refresh()
      onClose()
    })
  }

  function handleDelete() {
    if (!appointment) return
    if (!confirm('Cancelar este agendamento?')) return
    startTransition(async () => {
      await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id)
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-strong rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-semibold text-white">
            {appointment ? 'Editar agendamento' : 'Novo agendamento'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Patient search */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Paciente</label>
            {foundPatient ? (
              <div className="flex items-center justify-between glass rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm text-white font-medium">{foundPatient.full_name}</p>
                  <p className="text-xs text-white/40">{foundPatient.phone}</p>
                </div>
                <button
                  onClick={() => { setFoundPatient(null); setForm((p) => ({ ...p, patientId: '' })) }}
                  className="text-white/30 hover:text-white/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPatient()}
                  placeholder="Telefone ou CPF do paciente"
                  className="flex-1 bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                />
                <button
                  onClick={searchPatient}
                  className="glass rounded-xl px-3 py-2.5 text-white/60 hover:text-white transition-all"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            )}
            {searchError && <p className="text-xs text-red-400 mt-1">{searchError}</p>}
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Serviço</label>
            <input
              value={form.service}
              onChange={(e) => update('service', e.target.value)}
              placeholder="Ex: Limpeza de pele, Consulta..."
              className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
            />
          </div>

          {/* Professional */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Profissional</label>
            <select
              value={form.professional_id}
              onChange={(e) => update('professional_id', e.target.value)}
              className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1A000A]">{p.name}</option>
              ))}
            </select>
          </div>

          {/* Date + Time + Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Horário</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => update('time', e.target.value)}
                className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Duração (min)</label>
              <input
                type="number"
                value={form.duration}
                min={15}
                step={15}
                onChange={(e) => update('duration', Number(e.target.value))}
                className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              />
            </div>
          </div>

          {/* Status + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#1A000A]">{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Valor (R$)</label>
              <input
                type="number"
                value={form.price}
                min={0}
                step={0.01}
                placeholder="0,00"
                onChange={(e) => update('price', e.target.value)}
                className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              placeholder="Observações internas..."
              className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex items-center justify-between gap-3">
          {appointment && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" /> Cancelar
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="glass px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-all"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !form.service || !form.professional_id}
              className="brand-gradient text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
