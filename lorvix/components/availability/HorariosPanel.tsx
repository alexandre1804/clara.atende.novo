'use client'

import { useState, useTransition } from 'react'
import { Save, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Availability } from '@/types'

const DAYS = [
  { label: 'Segunda',  short: 'Seg', value: 1 },
  { label: 'Terça',    short: 'Ter', value: 2 },
  { label: 'Quarta',   short: 'Qua', value: 3 },
  { label: 'Quinta',   short: 'Qui', value: 4 },
  { label: 'Sexta',    short: 'Sex', value: 5 },
  { label: 'Sábado',   short: 'Sáb', value: 6 },
  { label: 'Domingo',  short: 'Dom', value: 0 },
]

const DURATIONS = [
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
]

interface DayState {
  id:             string | null
  enabled:        boolean
  start_time:     string
  end_time:       string
  slot_duration:  number
}

interface Props {
  clinicId:     string
  availability: Availability[]
  readonly:     boolean
}

function initDays(availability: Availability[]): Record<number, DayState> {
  const map: Record<number, DayState> = {}
  for (const d of DAYS) {
    const row = availability.find((a) => a.day_of_week === d.value)
    map[d.value] = row
      ? { id: row.id, enabled: true, start_time: row.start_time.slice(0, 5), end_time: row.end_time.slice(0, 5), slot_duration: row.slot_duration }
      : { id: null, enabled: false, start_time: '08:00', end_time: '18:00', slot_duration: 30 }
  }
  return map
}

export function HorariosPanel({ clinicId, availability, readonly }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [days, setDays] = useState<Record<number, DayState>>(() => initDays(availability))
  const [msg, setMsg] = useState<string | null>(null)

  function update(day: number, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))
    setMsg(null)
  }

  function copyWeekdays() {
    const mon = days[1]
    setDays((prev) => {
      const next = { ...prev }
      for (const d of [2, 3, 4, 5]) {
        next[d] = { ...next[d], enabled: mon.enabled, start_time: mon.start_time, end_time: mon.end_time, slot_duration: mon.slot_duration }
      }
      return next
    })
  }

  function save() {
    setMsg(null)
    startTransition(async () => {
      const supabase = createClient()
      const errors: string[] = []

      for (const d of DAYS) {
        const cfg = days[d.value]

        if (cfg.enabled) {
          if (cfg.start_time >= cfg.end_time) {
            errors.push(`${d.label}: horário de início deve ser antes do fim`)
            continue
          }

          if (cfg.id) {
            const { error } = await supabase.from('availability').update({
              start_time:    cfg.start_time,
              end_time:      cfg.end_time,
              slot_duration: cfg.slot_duration,
            }).eq('id', cfg.id)
            if (error) errors.push(`${d.label}: ${error.message}`)
          } else {
            const { data, error } = await supabase.from('availability').insert({
              clinic_id:       clinicId,
              professional_id: null,
              day_of_week:     d.value,
              start_time:      cfg.start_time,
              end_time:        cfg.end_time,
              slot_duration:   cfg.slot_duration,
            }).select('id').single()
            if (error) {
              errors.push(`${d.label}: ${error.message}`)
            } else if (data) {
              setDays((prev) => ({ ...prev, [d.value]: { ...prev[d.value], id: (data as { id: string }).id } }))
            }
          }
        } else if (cfg.id) {
          const { error } = await supabase.from('availability').delete().eq('id', cfg.id)
          if (error) {
            errors.push(`${d.label}: ${error.message}`)
          } else {
            setDays((prev) => ({ ...prev, [d.value]: { ...prev[d.value], id: null } }))
          }
        }
      }

      if (errors.length > 0) {
        setMsg(`Erros: ${errors.join(' | ')}`)
      } else {
        setMsg('Horários salvos com sucesso!')
        router.refresh()
      }
    })
  }

  const enabledCount = DAYS.filter((d) => days[d.value].enabled).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Horários de Funcionamento</h1>
          <p className="text-sm text-white/40">
            {enabledCount === 0 ? 'Nenhum dia configurado' : `${enabledCount} dia${enabledCount !== 1 ? 's' : ''} ativo${enabledCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        {!readonly && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={copyWeekdays}
              className="glass text-white/60 hover:text-white text-sm px-3 py-2 rounded-xl inline-flex items-center gap-2 transition-all"
              title="Copiar horário de segunda-feira para toda a semana"
            >
              <Copy className="w-4 h-4" /> Seg → Sex
            </button>
            <button
              onClick={save}
              disabled={isPending}
              className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" /> {isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p className={`text-sm font-medium ${msg.startsWith('Erros') ? 'text-red-400' : 'text-green-400'}`}>
          {msg}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS.map((d) => {
          const cfg = days[d.value]
          const isWeekend = d.value === 0 || d.value === 6
          return (
            <div
              key={d.value}
              className={cn(
                'glass rounded-2xl p-5 space-y-4 transition-all',
                !cfg.enabled && 'opacity-60',
              )}
            >
              {/* Day header + toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn('font-semibold text-white', isWeekend && 'text-white/70')}>
                    {d.label}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {cfg.enabled ? `${cfg.start_time} – ${cfg.end_time}` : 'Fechado'}
                  </p>
                </div>
                {!readonly && (
                  <button
                    onClick={() => update(d.value, { enabled: !cfg.enabled })}
                    className={cn(
                      'w-11 h-6 rounded-full transition-all relative shrink-0',
                      cfg.enabled ? 'brand-gradient' : 'bg-white/10',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                      cfg.enabled ? 'left-[22px]' : 'left-0.5',
                    )} />
                  </button>
                )}
              </div>

              {/* Time inputs */}
              <div className={cn('space-y-3', (!cfg.enabled || readonly) && 'pointer-events-none')}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1 font-medium uppercase tracking-wide">Início</label>
                    <input
                      type="time"
                      value={cfg.start_time}
                      onChange={(e) => update(d.value, { start_time: e.target.value })}
                      disabled={!cfg.enabled || readonly}
                      className="w-full rounded-xl px-2 py-2 text-sm text-white disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 mb-1 font-medium uppercase tracking-wide">Fim</label>
                    <input
                      type="time"
                      value={cfg.end_time}
                      onChange={(e) => update(d.value, { end_time: e.target.value })}
                      disabled={!cfg.enabled || readonly}
                      className="w-full rounded-xl px-2 py-2 text-sm text-white disabled:opacity-40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-white/40 mb-1 font-medium uppercase tracking-wide">Duração do slot</label>
                  <select
                    value={cfg.slot_duration}
                    onChange={(e) => update(d.value, { slot_duration: Number(e.target.value) })}
                    disabled={!cfg.enabled || readonly}
                    className="w-full rounded-xl px-2 py-2 text-sm text-white disabled:opacity-40"
                  >
                    {DURATIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slot count preview */}
              {cfg.enabled && (
                <p className="text-[10px] text-white/30 text-right">
                  {(() => {
                    const [sh, sm] = cfg.start_time.split(':').map(Number)
                    const [eh, em] = cfg.end_time.split(':').map(Number)
                    const total = (eh * 60 + em) - (sh * 60 + sm)
                    const slots = total > 0 ? Math.floor(total / cfg.slot_duration) : 0
                    return `${slots} horário${slots !== 1 ? 's' : ''} disponível${slots !== 1 ? 'is' : ''}`
                  })()}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
