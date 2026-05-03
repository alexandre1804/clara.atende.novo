'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Save, Trash2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
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

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const defaultDateStr = defaultDate
    ? defaultDate.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const defaultTimeStr = defaultHour != null
    ? `${String(defaultHour).padStart(2, '0')}:00`
    : '09:00'

  const [form, setForm] = useState({
    service:         appointment?.service ?? '',
    professional_id: appointment?.professional_id ?? (professionals[0]?.id ?? ''),
    date:            appointment ? new Date(appointment.start_datetime).toISOString().slice(0, 10) : defaultDateStr,
    time:            appointment ? new Date(appointment.start_datetime).toTimeString().slice(0, 5) : defaultTimeStr,
    duration:        appointment
      ? Math.round((new Date(appointment.end_datetime).getTime() - new Date(appointment.start_datetime).getTime()) / 60000)
      : 30,
    status:          (appointment?.status ?? 'scheduled') as AppointmentStatus,
    notes:           appointment?.notes ?? '',
    price:           appointment?.price ?? '',
    patientId:       appointment?.patient_id ?? '',
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
    const query = patientSearch.replace(/\D/g, '')
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .or(`phone.eq.${query},cpf.eq.${query}`)
      .single()
    if (data) {
      setFoundPatient(data as Patient)
      setForm((prev) => ({ ...prev, patientId: data.id }))
      setSearchError('')
    } else {
      setSearchError('Paciente não encontrado. Verifique telefone ou CPF.')
    }
  }

  function handleSave() {
    startTransition(async () => {
      const startDt = new Date(`${form.date}T${form.time}:00`)
      const endDt   = new Date(startDt.getTime() + form.duration * 60000)

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
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointment.id)
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Solid opaque backdrop — no blur, no see-through */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(8,4,7,0.92)' }}
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative glass-strong rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col">
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="font-bold text-white text-base">
            {appointment ? 'Editar agendamento' : 'Novo agendamento'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'linear-gradient(145deg,#2a1a22,#1c1218)',
              boxShadow: '2px 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Patient */}
          <Field label="Paciente">
            {foundPatient ? (
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{
                  background: 'linear-gradient(145deg,#0b0709,#130a0d)',
                  boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.65)',
                  border: '1px solid rgba(0,0,0,0.6)',
                }}
              >
                <div>
                  <p className="text-sm text-white font-semibold">{foundPatient.full_name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>{foundPatient.phone}</p>
                </div>
                <button
                  onClick={() => { setFoundPatient(null); setForm((p) => ({ ...p, patientId: '' })) }}
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  className="hover:text-white/70 transition-colors"
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
                  placeholder="Telefone ou CPF"
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                />
                <button
                  onClick={searchPatient}
                  className="px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: 'linear-gradient(145deg,#2a1a22,#1c1218)',
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
                    border: '1px solid rgba(0,0,0,0.5)',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            )}
            {searchError && <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>{searchError}</p>}
          </Field>

          {/* Service */}
          <Field label="Serviço *">
            <input
              value={form.service}
              onChange={(e) => update('service', e.target.value)}
              placeholder="Ex: Limpeza de pele, Consulta..."
              className="w-full rounded-xl px-3 py-2.5 text-sm"
            />
          </Field>

          {/* Professional */}
          <Field label="Profissional">
            <select
              value={form.professional_id}
              onChange={(e) => update('professional_id', e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#1a1015' }}>{p.name}</option>
              ))}
            </select>
          </Field>

          {/* Date + Time + Duration */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Data">
              <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)}
                className="w-full rounded-xl px-2 py-2.5 text-sm [color-scheme:dark]" />
            </Field>
            <Field label="Horário">
              <input type="time" value={form.time} onChange={(e) => update('time', e.target.value)}
                className="w-full rounded-xl px-2 py-2.5 text-sm [color-scheme:dark]" />
            </Field>
            <Field label="Duração (min)">
              <input type="number" value={form.duration} min={15} step={15}
                onChange={(e) => update('duration', Number(e.target.value))}
                className="w-full rounded-xl px-2 py-2.5 text-sm" />
            </Field>
          </div>

          {/* Status + Price */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={form.status} onChange={(e) => update('status', e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm">
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value} style={{ background: '#1a1015' }}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Valor (R$)">
              <input type="number" value={form.price} min={0} step={0.01} placeholder="0,00"
                onChange={(e) => update('price', e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm" />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Observações">
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)}
              rows={2} placeholder="Observações internas..."
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none" />
          </Field>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex items-center justify-between gap-3 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          {appointment ? (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all disabled:opacity-50"
              style={{ color: '#FCA5A5' }}
            >
              <Trash2 className="w-4 h-4" /> Cancelar
            </button>
          ) : <div />}

          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(145deg,#2a1a22,#1c1218)',
                boxShadow: '3px 3px 9px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
                border: '1px solid rgba(0,0,0,0.5)',
                color: 'rgba(255,255,255,0.60)',
              }}
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !form.service || !form.professional_id}
              className={cn(
                'brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2 rounded-xl',
                'inline-flex items-center gap-2 transition-all',
                'hover:opacity-90 disabled:opacity-40',
              )}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: 'rgba(255,255,255,0.40)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
