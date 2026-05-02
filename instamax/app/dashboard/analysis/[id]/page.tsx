import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import BuyScheduleButton from './BuyScheduleButton'
import AnalysisRefreshPollerClient from './AnalysisRefreshPollerClient'
import type { Analysis, Schedule, AnalysisData } from '@/types'

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: raw } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!raw) notFound()

  const analysis = raw as Analysis

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('analysis_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const weekSchedule = (schedules ?? []).find(
    (s: Schedule) => s.type === 'week' && s.status === 'complete'
  ) as Schedule | undefined

  const monthSchedule = (schedules ?? []).find(
    (s: Schedule) => s.type === 'month' && s.status === 'complete'
  ) as Schedule | undefined

  if (analysis.status === 'processing' || analysis.status === 'pending') {
    return <ProcessingView analysisId={id} />
  }

  if (analysis.status === 'failed') {
    return <ErrorView />
  }

  const d = analysis.analysis_data as AnalysisData

  return (
    <div className="min-h-screen bg-[#080808] text-white font-[family-name:var(--font-outfit)]">
      {/* NAV */}
      <nav className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-white/40 hover:text-white/70 transition-colors text-sm">
              ← Dashboard
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-sm text-white/60">Análise</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-black">
              IM
            </div>
            <span className="font-bold text-sm tracking-tight">InstaMax</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black tracking-tight">{analysis.niche}</h1>
              <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-xs">
                Concluída
              </Badge>
            </div>
            <p className="text-white/45 text-sm">{analysis.objective}</p>
          </div>
          {/* Score */}
          <ScoreCircle score={d.score} />
        </div>

        {/* Summary */}
        <Card className="bg-pink-500/5 border-pink-500/20 rounded-2xl">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-3">
              Diagnóstico
            </p>
            <p className="text-white/80 leading-relaxed">{d.summary}</p>
          </CardContent>
        </Card>

        {/* Strengths / Weaknesses / Opportunities */}
        <div className="grid md:grid-cols-3 gap-4">
          <SWOTCard
            icon="✅"
            title="Pontos Fortes"
            items={d.strengths}
            colorClass="border-green-500/20 bg-green-500/[0.04]"
            tagClass="text-green-400"
          />
          <SWOTCard
            icon="⚠️"
            title="Pontos Fracos"
            items={d.weaknesses}
            colorClass="border-yellow-500/20 bg-yellow-500/[0.04]"
            tagClass="text-yellow-400"
          />
          <SWOTCard
            icon="🚀"
            title="Oportunidades"
            items={d.opportunities}
            colorClass="border-blue-500/20 bg-blue-500/[0.04]"
            tagClass="text-blue-400"
          />
        </div>

        {/* Profile fixes */}
        {d.profile_fixes?.length > 0 && (
          <Section title="Correções Recomendadas" icon="🔧">
            <div className="space-y-3">
              {d.profile_fixes.map((fix, i) => {
                const pMap: Record<string, string> = {
                  alta: 'bg-red-500/15 text-red-400 border-red-500/20',
                  média: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
                  baixa: 'bg-white/10 text-white/50 border-white/15',
                }
                return (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-bold text-sm text-white">{fix.area}</span>
                      <Badge className={`text-xs ${pMap[fix.priority] ?? pMap.baixa}`}>
                        {fix.priority}
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-white/35 text-xs mb-1 uppercase tracking-wide">Hoje</p>
                        <p className="text-white/60">{fix.current}</p>
                      </div>
                      <div>
                        <p className="text-green-400/70 text-xs mb-1 uppercase tracking-wide">Recomendado</p>
                        <p className="text-white/80">{fix.recommended}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Strategy grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <InfoCard title="Posicionamento" icon="🎯" text={d.positioning} />
          <InfoCard title="Tom de Voz" icon="🗣️" text={d.voice_tone} />
          <InfoCard title="Frequência de Postagem" icon="📅" text={d.posting_frequency} />
          <InfoCard title="Previsão de Crescimento" icon="📈" text={d.growth_forecast} />
        </div>

        {/* Content pillars + hashtag + best times */}
        <div className="grid md:grid-cols-3 gap-4">
          <TagsCard title="Pilares de Conteúdo" icon="🏛️" items={d.content_pillars} colorClass="bg-purple-500/15 text-purple-300 border-purple-500/20" />
          <TagsCard title="Melhores Horários" icon="⏰" items={d.best_times} colorClass="bg-pink-500/15 text-pink-300 border-pink-500/20" />
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">📌 Estratégia de Hashtags</p>
            <p className="text-sm text-white/70 leading-relaxed">{d.hashtag_strategy}</p>
          </div>
        </div>

        {/* Schedules */}
        <Section title="Cronogramas" icon="📆">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Weekly — included */}
            <Card className={`rounded-2xl ${weekSchedule ? 'border-green-500/20 bg-green-500/[0.04]' : 'bg-white/[0.03] border-white/[0.07]'}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📅</span>
                  <div>
                    <p className="font-bold text-sm">Cronograma Semanal</p>
                    <p className="text-white/40 text-xs">7 dias · incluso na análise</p>
                  </div>
                </div>
                {weekSchedule ? (
                  <Link href={`/dashboard/schedule/${weekSchedule.id}`}>
                    <Button className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 rounded-xl h-10 text-sm">
                      Ver cronograma →
                    </Button>
                  </Link>
                ) : (
                  <p className="text-white/30 text-xs text-center py-2">Gerando...</p>
                )}
              </CardContent>
            </Card>

            {/* Monthly — paid */}
            <Card className={`rounded-2xl ${monthSchedule ? 'border-pink-500/20 bg-pink-500/[0.04]' : 'bg-white/[0.03] border-white/[0.07]'}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🗓️</span>
                  <div>
                    <p className="font-bold text-sm">Cronograma Mensal</p>
                    <p className="text-white/40 text-xs">30 dias · R$29</p>
                  </div>
                </div>
                {monthSchedule ? (
                  <Link href={`/dashboard/schedule/${monthSchedule.id}`}>
                    <Button className="w-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 rounded-xl h-10 text-sm">
                      Ver cronograma →
                    </Button>
                  </Link>
                ) : (
                  <BuyScheduleButton analysisId={analysis.id} type="schedule_month" />
                )}
              </CardContent>
            </Card>
          </div>
        </Section>
      </main>
    </div>
  )
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444'
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black text-white">{score}</span>
        </div>
      </div>
      <span className="text-xs text-white/35 mt-1">Saúde do perfil</span>
    </div>
  )
}

function SWOTCard({
  icon, title, items, colorClass, tagClass,
}: {
  icon: string
  title: string
  items: string[]
  colorClass: string
  tagClass: string
}) {
  return (
    <div className={`border rounded-2xl p-5 ${colorClass}`}>
      <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${tagClass}`}>
        {icon} {title}
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-white/70 leading-snug">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-bold text-sm text-white/50 uppercase tracking-wider mb-4">
        {icon} {title}
      </h2>
      {children}
    </div>
  )
}

function InfoCard({ title, icon, text }: { title: string; icon: string; text: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
      <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
        {icon} {title}
      </p>
      <p className="text-sm text-white/70 leading-relaxed">{text}</p>
    </div>
  )
}

function TagsCard({
  title, icon, items, colorClass,
}: {
  title: string
  icon: string
  items: string[]
  colorClass: string
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
      <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
        {icon} {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <Badge key={i} className={`text-xs border ${colorClass}`}>{item}</Badge>
        ))}
      </div>
    </div>
  )
}

function ProcessingView({ analysisId }: { analysisId: string }) {
  return (
    <div className="min-h-screen bg-[#080808] text-white font-[family-name:var(--font-outfit)] flex flex-col items-center justify-center px-6">
      <div className="w-12 h-12 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-6" />
      <h2 className="text-xl font-black mb-2">Análise em andamento</h2>
      <p className="text-white/45 text-sm mb-6">A IA está analisando seu perfil. Isso leva alguns minutos.</p>
      <AnalysisRefreshPoller analysisId={analysisId} />
      <Link href="/dashboard" className="mt-4 text-sm text-white/30 hover:text-white/60 transition-colors">
        ← Voltar ao dashboard
      </Link>
    </div>
  )
}

function ErrorView() {
  return (
    <div className="min-h-screen bg-[#080808] text-white font-[family-name:var(--font-outfit)] flex flex-col items-center justify-center px-6">
      <div className="text-4xl mb-4">❌</div>
      <h2 className="text-xl font-black mb-2">Análise falhou</h2>
      <p className="text-white/45 text-sm mb-6">Ocorreu um erro ao processar. Entre em contato com o suporte.</p>
      <Link href="/dashboard">
        <Button className="bg-white/10 hover:bg-white/15 rounded-xl">Voltar ao dashboard</Button>
      </Link>
    </div>
  )
}

function AnalysisRefreshPoller({ analysisId }: { analysisId: string }) {
  return <AnalysisRefreshPollerClient analysisId={analysisId} />
}
