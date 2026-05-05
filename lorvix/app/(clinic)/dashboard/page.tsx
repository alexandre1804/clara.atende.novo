import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CalendarDays, CalendarRange, Clock4, UserX, TrendingUp } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: number | string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-white/30 mt-1">{sub}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const { user } = await requireAuth()
  const supabase  = await createClient()

  const now = new Date()

  // ── Date ranges ──────────────────────────────────────────────────────────
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

  const weekStart = new Date(now)
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1 // Monday = 0
  weekStart.setDate(now.getDate() - dow)
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  // ── Parallel queries ──────────────────────────────────────────────────────
  const [
    { count: cntDay },
    { count: cntWeek },
    { count: cntMonth },
    { count: cntNoShow },
    { count: cntCompleted },
    { data: monthAppts },
  ] = await Promise.all([
    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', user.clinic_id)
      .gte('start_datetime', todayStart).lte('start_datetime', todayEnd)
      .not('status', 'eq', 'cancelled'),

    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', user.clinic_id)
      .gte('start_datetime', weekStart.toISOString())
      .not('status', 'eq', 'cancelled'),

    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', user.clinic_id)
      .gte('start_datetime', monthStart).lte('start_datetime', monthEnd)
      .not('status', 'eq', 'cancelled'),

    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', user.clinic_id).eq('status', 'no_show')
      .gte('start_datetime', monthStart).lte('start_datetime', monthEnd),

    supabase.from('appointments').select('*', { count: 'exact', head: true })
      .eq('clinic_id', user.clinic_id).eq('status', 'completed')
      .gte('start_datetime', monthStart).lte('start_datetime', monthEnd),

    supabase.from('appointments').select('service')
      .eq('clinic_id', user.clinic_id)
      .gte('start_datetime', monthStart).lte('start_datetime', monthEnd)
      .not('status', 'eq', 'cancelled'),
  ])

  // ── Top services ─────────────────────────────────────────────────────────
  const svcMap: Record<string, number> = {}
  for (const a of monthAppts ?? []) {
    const s = a.service as string
    svcMap[s] = (svcMap[s] ?? 0) + 1
  }
  const topServices = Object.entries(svcMap).sort(([, a], [, b]) => b - a).slice(0, 6)
  const maxCount    = topServices[0]?.[1] ?? 1

  const totalMonth   = cntMonth   ?? 0
  const noShowMonth  = cntNoShow  ?? 0
  const completedMonth = cntCompleted ?? 0
  const absenceRate  = totalMonth > 0 ? Math.round((noShowMonth / totalMonth) * 100) : 0

  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const weekLabel  = `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 capitalize">{monthLabel}</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Hoje"
          value={cntDay ?? 0}
          sub={now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          icon={Clock4}
          color="brand-gradient"
        />
        <StatCard
          label="Esta semana"
          value={cntWeek ?? 0}
          sub={weekLabel}
          icon={CalendarDays}
          color="brand-gradient"
        />
        <StatCard
          label="Este mês"
          value={totalMonth}
          sub={`${completedMonth} concluídos`}
          icon={CalendarRange}
          color="brand-gradient"
        />
        <StatCard
          label="Faltas no mês"
          value={noShowMonth}
          sub={`${absenceRate}% de ausência`}
          icon={UserX}
          color="bg-red-500/80"
        />
      </div>

      {/* ── Top services ── */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-white/50" />
          <h2 className="font-semibold text-white text-sm">Serviços mais realizados</h2>
          <span className="text-xs text-white/30 ml-auto capitalize">{monthLabel}</span>
        </div>

        {topServices.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">Nenhum atendimento registrado este mês.</p>
        ) : (
          <div className="space-y-3">
            {topServices.map(([name, count], i) => {
              const pct = Math.round((count / maxCount) * 100)
              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white/25 w-4 text-right shrink-0">{i + 1}</span>
                      <span className="text-white/80 font-medium truncate">{name}</span>
                    </div>
                    <span className="text-white/50 shrink-0 ml-3">{count}×</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className="h-full rounded-full brand-gradient transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Resumo mensal ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Agendados',   value: totalMonth - completedMonth - noShowMonth, color: 'text-blue-400'   },
          { label: 'Concluídos',  value: completedMonth,                             color: 'text-green-400'  },
          { label: 'Não vieram',  value: noShowMonth,                                color: 'text-red-400'    },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-4 text-center">
            <p className={`text-xl font-bold ${color}`}>{value < 0 ? 0 : value}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
