'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock, List } from 'lucide-react'
import { formatDate, formatTime, cn } from '@/lib/utils'
import type { Appointment, Professional, UserRole } from '@/types'
import { AppointmentModal } from './AppointmentModal'

const STATUS_STYLES: Record<string, string> = {
  scheduled:  'status-scheduled',
  confirmed:  'status-confirmed',
  completed:  'status-completed',
  cancelled:  'status-cancelled',
  no_show:    'status-no_show',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show:   'Não compareceu',
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7h–19h

interface Props {
  appointments: Appointment[]
  professionals: Professional[]
  clinicId: string
  userRole: UserRole
}

export function CalendarView({ appointments, professionals, clinicId, userRole }: Props) {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(today)
  const [view, setView] = useState<'week' | 'day' | 'list'>('week')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null)

  const weekDays = useMemo(() => {
    const start = new Date(currentDate)
    const day = start.getDay()
    start.setDate(start.getDate() - day + 1) // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [currentDate])

  const dayAppts = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    appointments.forEach((a) => {
      const key = new Date(a.start_datetime).toDateString()
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    })
    return map
  }, [appointments])

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate)
    if (view === 'week') {
      d.setDate(d.getDate() + dir * 7)
    } else {
      d.setDate(d.getDate() + dir)
    }
    setCurrentDate(d)
  }

  function openNewAppt(date: Date, hour: number) {
    if (userRole === 'doctor') return
    setSelectedAppt(null)
    setSelectedSlot({ date, hour })
    setModalOpen(true)
  }

  const headerLabel = view === 'week'
    ? `${formatDate(weekDays[0])} — ${formatDate(weekDays[6])}`
    : currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Single-day appointments sorted by time
  const listDayAppts = useMemo(() =>
    (dayAppts.get(currentDate.toDateString()) ?? [])
      .slice()
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()),
    [dayAppts, currentDate],
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Agenda</h1>
          <p className="text-sm text-white/40">{headerLabel}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="glass rounded-xl p-1 flex gap-1 text-xs">
            {(['week', 'day', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all font-medium inline-flex items-center gap-1.5',
                  view === v ? 'brand-gradient text-white' : 'text-white/50 hover:text-white',
                )}
              >
                {v === 'list' && <List className="w-3 h-3" />}
                {v === 'week' ? 'Semana' : v === 'day' ? 'Dia' : 'Lista'}
              </button>
            ))}
          </div>

          {/* Nav arrows */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="glass rounded-lg p-2 text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="glass rounded-lg px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all">
              Hoje
            </button>
            <button onClick={() => navigate(1)} className="glass rounded-lg p-2 text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {userRole !== 'doctor' && (
            <button
              onClick={() => { setSelectedAppt(null); setSelectedSlot(null); setModalOpen(true) }}
              className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" /> Novo
            </button>
          )}
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Week day selector */}
          <div className="grid grid-cols-7 border-b border-white/10">
            {weekDays.map((day) => {
              const isSelected = day.toDateString() === currentDate.toDateString()
              const isToday = day.toDateString() === today.toDateString()
              const count = (dayAppts.get(day.toDateString()) ?? []).length
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setCurrentDate(day)}
                  className={cn(
                    'py-3 text-center transition-all hover:bg-white/5',
                    isSelected && 'brand-gradient',
                  )}
                >
                  <div className="text-[10px] text-white/50 uppercase tracking-wide">
                    {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div className={cn(
                    'text-base font-semibold mt-0.5',
                    isToday && !isSelected ? 'text-pink-400' : 'text-white',
                  )}>
                    {day.getDate()}
                  </div>
                  {count > 0 && (
                    <div className="text-[10px] text-white/50 mt-0.5">{count}</div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Appointments list */}
          {listDayAppts.length === 0 ? (
            <div className="py-14 text-center text-white/30 text-sm">
              Nenhum agendamento para este dia.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {listDayAppts.map((appt) => {
                const prof = professionals.find((p) => p.id === appt.professional_id)
                return (
                  <div
                    key={appt.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => { setSelectedAppt(appt); setModalOpen(true) }}
                  >
                    <span className="text-sm font-mono text-white/50 w-11 shrink-0">
                      {formatTime(appt.start_datetime)}
                    </span>
                    <div
                      className="w-1.5 h-10 rounded-full shrink-0"
                      style={{ background: prof?.color ?? 'var(--brand-primary)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {(appt.patient as { full_name?: string })?.full_name ?? '—'}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {appt.service}
                        {prof ? ` · ${prof.name}` : ''}
                      </p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0', STATUS_STYLES[appt.status])}>
                      {STATUS_LABELS[appt.status]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── WEEK / DAY VIEW ── */}
      {(view === 'week' || view === 'day') && (
        <>
          <div className="glass rounded-2xl overflow-hidden">
            {/* Day headers */}
            {view === 'week' ? (
              <div className="grid grid-cols-8 border-b border-white/10">
                <div className="py-3 px-2 text-xs text-white/30" />
                {weekDays.map((day) => {
                  const isToday = day.toDateString() === today.toDateString()
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => { setCurrentDate(day); setView('day') }}
                      className="py-3 text-center hover:bg-white/5 transition-colors w-full"
                    >
                      <div className="text-xs text-white/40 uppercase">
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </div>
                      <div className={cn(
                        'text-sm font-semibold mt-1 w-8 h-8 flex items-center justify-center rounded-full mx-auto',
                        isToday ? 'brand-gradient text-white' : 'text-white/80',
                      )}>
                        {day.getDate()}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 border-b border-white/10">
                <div className="py-3 px-2 text-xs text-white/30" />
                <div className="py-3 text-center">
                  <div className="text-xs text-white/40 uppercase">
                    {currentDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div className={cn(
                    'text-sm font-semibold mt-1 w-8 h-8 flex items-center justify-center rounded-full mx-auto',
                    currentDate.toDateString() === today.toDateString() ? 'brand-gradient text-white' : 'text-white/80',
                  )}>
                    {currentDate.getDate()}
                  </div>
                </div>
              </div>
            )}

            {/* Time slots */}
            <div className="overflow-y-auto max-h-[60vh]">
              {HOURS.map((hour) => {
                const displayDays = view === 'week' ? weekDays : [currentDate]
                const cols = view === 'week' ? 'grid-cols-8' : 'grid-cols-2'
                return (
                  <div key={hour} className={`grid ${cols} border-b border-white/5 hover:bg-white/2 transition-colors min-h-[64px]`}>
                    <div className="py-2 px-3 text-xs text-white/25 text-right pt-2 shrink-0">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    {displayDays.map((day) => {
                      const cellAppts = (dayAppts.get(day.toDateString()) ?? []).filter((a) =>
                        new Date(a.start_datetime).getHours() === hour,
                      )
                      return (
                        <div
                          key={day.toISOString()}
                          className="border-l border-white/5 p-1 cursor-pointer hover:bg-white/5 transition-colors relative"
                          onClick={() => openNewAppt(day, hour)}
                        >
                          {cellAppts.map((appt) => {
                            const prof = professionals.find((p) => p.id === appt.professional_id)
                            return (
                              <div
                                key={appt.id}
                                className="rounded-lg p-1.5 text-xs mb-1 cursor-pointer hover:opacity-80 transition-opacity border"
                                style={{
                                  background: `${prof?.color ?? '#5C0018'}22`,
                                  borderColor: `${prof?.color ?? '#5C0018'}55`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedAppt(appt)
                                  setModalOpen(true)
                                }}
                              >
                                <div className="font-medium truncate text-white">
                                  {(appt.patient as { full_name?: string })?.full_name ?? '—'}
                                </div>
                                <div className="text-white/50 truncate flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatTime(appt.start_datetime)}
                                  {' · '}
                                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium', STATUS_STYLES[appt.status])}>
                                    {STATUS_LABELS[appt.status]}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          {professionals.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {professionals.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-xs text-white/50">
                  <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <AppointmentModal
          appointment={selectedAppt}
          professionals={professionals}
          clinicId={clinicId}
          defaultDate={selectedSlot?.date}
          defaultHour={selectedSlot?.hour}
          onClose={() => { setModalOpen(false); setSelectedAppt(null) }}
        />
      )}
    </div>
  )
}
