'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Check, Clock, User, ArrowLeft } from 'lucide-react'
import type { Clinic, Professional } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  clinic: Clinic
  professionals: Professional[]
}

type Step = 'professional' | 'service' | 'datetime' | 'patient' | 'confirm'

const SERVICES_BY_SPECIALTY: Record<string, string[]> = {
  'Estética Facial':    ['Limpeza de pele', 'Hidratação facial', 'Peeling', 'Microagulhamento', 'Botox'],
  'Estética Corporal':  ['Drenagem linfática', 'Massagem modeladora', 'Redução de medidas', 'Cavitação'],
  'Odontologia Geral':  ['Consulta', 'Limpeza', 'Clareamento', 'Restauração', 'Extração'],
  'Ortodontia':         ['Consulta de avaliação', 'Instalação de aparelho', 'Manutenção'],
  'Fisioterapia':       ['Avaliação', 'Sessão de fisioterapia', 'RPG', 'Pilates terapêutico'],
  'Nutrição':           ['Consulta nutricional', 'Retorno', 'Plano alimentar'],
  'Psicologia':         ['Consulta inicial', 'Sessão de terapia'],
}

function getServices(specialty: string): string[] {
  for (const [key, vals] of Object.entries(SERVICES_BY_SPECIALTY)) {
    if (specialty.toLowerCase().includes(key.toLowerCase())) return vals
  }
  return ['Consulta', 'Avaliação', 'Sessão', 'Retorno']
}

function buildDays(month: Date): Date[] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const days: Date[] = []
  for (let i = 0; i < firstDay; i++) days.push(new Date(0))
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, m, d))
  return days
}

export function PublicBooking({ clinic, professionals }: Props) {
  const [step, setStep] = useState<Step>('professional')
  const [isPending, startTransition] = useTransition()

  const [selectedProf, setSelectedProf] = useState<Professional | null>(null)
  const [selectedService, setSelectedService] = useState('')
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [patientForm, setPatientForm] = useState({ full_name: '', phone: '', email: '' })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function loadSlots(date: Date) {
    if (!selectedProf) return
    setLoadingSlots(true)
    setAvailableSlots([])
    setSelectedTime('')
    const dateStr = date.toISOString().slice(0, 10)
    try {
      const res = await fetch(
        `/api/public/availability?clinic_id=${clinic.id}&professional_id=${selectedProf.id}&date=${dateStr}`,
      )
      if (res.ok) {
        const data = await res.json()
        setAvailableSlots(data.available_slots ?? [])
      }
    } finally {
      setLoadingSlots(false)
    }
  }

  function selectDate(date: Date) {
    if (date.getTime() === 0) return
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (date < today) return
    setSelectedDate(date)
    loadSlots(date)
  }

  function handleBooking() {
    if (!patientForm.full_name || !patientForm.phone) {
      setError('Nome e telefone são obrigatórios.')
      return
    }
    setError('')
    startTransition(async () => {
      const dateStr  = selectedDate!.toISOString().slice(0, 10)
      const [hh, mm] = selectedTime.split(':')
      const startDt  = `${dateStr}T${hh.padStart(2, '0')}:${(mm ?? '00').padStart(2, '0')}:00`

      const aRes = await fetch('/api/public/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id:       clinic.id,
          professional_id: selectedProf!.id,
          service:         selectedService,
          start_datetime:  startDt,
          patient:         patientForm,
        }),
      })

      if (aRes.ok) {
        setSuccess(true)
      } else {
        const aData = await aRes.json()
        setError(aData.error ?? 'Erro ao agendar. Tente novamente.')
      }
    })
  }

  const brandGrad = `linear-gradient(135deg, ${clinic.primary_color}, ${clinic.secondary_color})`
  const today = new Date(); today.setHours(0, 0, 0, 0)

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0D0005 0%, #1A000A 100%)' }}>
        <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: brandGrad }}>
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Agendamento confirmado!</h2>
          <p className="text-white/60 text-sm mb-4">
            {selectedService} com {selectedProf?.name}<br />
            {selectedDate?.toLocaleDateString('pt-BR')} às {selectedTime}
          </p>
          <p className="text-xs text-white/40">
            Você receberá uma confirmação no WhatsApp {patientForm.phone}.
          </p>
        </div>
      </div>
    )
  }

  const steps: Step[] = ['professional', 'service', 'datetime', 'patient', 'confirm']
  const stepIdx = steps.indexOf(step)

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #0D0005 0%, #1A000A 100%)' }}>
      {/* Header */}
      <div className="max-w-lg mx-auto mb-6 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: brandGrad }}>
          <span className="text-white font-bold text-sm">{clinic.name.slice(0, 2).toUpperCase()}</span>
        </div>
        <h1 className="text-xl font-bold text-white">{clinic.name}</h1>
        <p className="text-sm text-white/50 mt-1">Agendamento online</p>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {steps.map((s, i) => (
            <div key={s} className={cn('h-1 rounded-full transition-all', i <= stepIdx ? 'w-8' : 'w-4', i <= stepIdx ? '' : 'bg-white/15')} style={i <= stepIdx ? { background: brandGrad } : {}} />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Step: Professional */}
        {step === 'professional' && (
          <div className="space-y-3">
            <h2 className="text-white font-semibold mb-4">Escolha o profissional</h2>
            {professionals.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProf(p); setStep('service') }}
                className="w-full glass rounded-2xl p-4 text-left flex items-center gap-4 hover:bg-white/10 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ background: p.color }}>
                  {p.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <p className="text-white font-medium">{p.name}</p>
                  <p className="text-white/50 text-sm">{p.specialty}</p>
                  {p.bio && <p className="text-white/35 text-xs mt-1 line-clamp-1">{p.bio}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: Service */}
        {step === 'service' && selectedProf && (
          <div>
            <button onClick={() => setStep('professional')} className="flex items-center gap-2 text-white/50 text-sm mb-4 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-white font-semibold mb-4">Escolha o serviço</h2>
            <div className="space-y-2">
              {getServices(selectedProf.specialty).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSelectedService(s); setStep('datetime') }}
                  className="w-full glass rounded-xl px-4 py-3 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center justify-between"
                >
                  {s}
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Date & Time */}
        {step === 'datetime' && (
          <div>
            <button onClick={() => setStep('service')} className="flex items-center gap-2 text-white/50 text-sm mb-4 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-white font-semibold mb-4">Escolha data e horário</h2>

            {/* Calendar */}
            <div className="glass rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() - 1); setCalMonth(d) }} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-white capitalize">
                  {calMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() + 1); setCalMonth(d) }} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-xs text-white/30 py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {buildDays(calMonth).map((day, idx) => {
                  const isEmpty = day.getTime() === 0
                  const isPast = !isEmpty && day < today
                  const isSelected = selectedDate?.toDateString() === day.toDateString()
                  return (
                    <button
                      key={idx}
                      disabled={isEmpty || isPast}
                      onClick={() => selectDate(day)}
                      className={cn(
                        'h-8 w-full rounded-lg text-xs font-medium transition-all',
                        isEmpty || isPast ? 'opacity-0 pointer-events-none' : '',
                        isSelected ? 'text-white' : isPast ? 'text-white/20' : 'text-white/70 hover:bg-white/10',
                      )}
                      style={isSelected ? { background: brandGrad } : {}}
                    >
                      {isEmpty ? '' : day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="glass rounded-2xl p-4">
                <p className="text-xs text-white/50 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Horários disponíveis em {selectedDate.toLocaleDateString('pt-BR')}
                </p>
                {loadingSlots ? (
                  <div className="text-center text-white/30 text-sm py-4">Carregando...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center text-white/30 text-sm py-4">Sem horários disponíveis neste dia.</div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setSelectedTime(t); setStep('patient') }}
                        className="py-2 rounded-lg text-xs font-medium transition-all text-white/80 hover:text-white"
                        style={{ background: selectedTime === t ? brandGrad : 'rgba(255,255,255,0.08)' }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Patient info */}
        {step === 'patient' && (
          <div>
            <button onClick={() => setStep('datetime')} className="flex items-center gap-2 text-white/50 text-sm mb-4 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-white font-semibold mb-4">Seus dados</h2>
            <div className="glass rounded-2xl p-5 space-y-4">
              {[
                { key: 'full_name', label: 'Nome completo *', placeholder: 'Maria da Silva' },
                { key: 'phone', label: 'WhatsApp *', placeholder: '(27) 99999-9999' },
                { key: 'email', label: 'E-mail', placeholder: 'seu@email.com' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">{label}</label>
                  <input
                    value={patientForm[key as keyof typeof patientForm]}
                    onChange={(e) => setPatientForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                  />
                </div>
              ))}

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

              <button
                onClick={() => setStep('confirm')}
                disabled={!patientForm.full_name || !patientForm.phone}
                className="w-full text-white font-semibold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                style={{ background: brandGrad }}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div>
            <button onClick={() => setStep('patient')} className="flex items-center gap-2 text-white/50 text-sm mb-4 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-white font-semibold mb-4">Confirmar agendamento</h2>
            <div className="glass rounded-2xl p-5 space-y-4 mb-4">
              {[
                { label: 'Profissional', value: selectedProf?.name },
                { label: 'Serviço', value: selectedService },
                { label: 'Data', value: selectedDate?.toLocaleDateString('pt-BR') },
                { label: 'Horário', value: selectedTime },
                { label: 'Paciente', value: patientForm.full_name },
                { label: 'WhatsApp', value: patientForm.phone },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-white/50">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">{error}</p>}

            <button
              onClick={handleBooking}
              disabled={isPending}
              className="w-full text-white font-semibold py-4 rounded-2xl text-sm hover:opacity-90 disabled:opacity-50 transition-all"
              style={{ background: brandGrad }}
            >
              {isPending ? 'Agendando...' : 'Confirmar agendamento'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
