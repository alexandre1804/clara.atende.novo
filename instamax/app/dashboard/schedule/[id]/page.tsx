import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ImageGenButton from './ImageGenButton'
import type { Schedule, ScheduleData, DaySchedule, ContentItem } from '@/types'

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: raw } = await supabase
    .from('schedules')
    .select('*, analyses(id, niche, objective)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!raw) notFound()

  const schedule = raw as Schedule & { analyses: { id: string; niche: string; objective: string } }

  if (schedule.status === 'processing' || schedule.status === 'pending') {
    return <ProcessingView />
  }

  if (schedule.status === 'failed' || !schedule.schedule_data) {
    return <ErrorView />
  }

  const data = schedule.schedule_data as ScheduleData
  const analysisId = schedule.analyses?.id ?? ''

  return (
    <div className="min-h-screen bg-[#080808] text-white font-[family-name:var(--font-outfit)]">
      {/* NAV */}
      <nav className="border-b border-white/[0.06] px-6 py-4 sticky top-0 bg-[#080808]/90 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={analysisId ? `/dashboard/analysis/${analysisId}` : '/dashboard'}
              className="text-white/40 hover:text-white/70 transition-colors text-sm"
            >
              ← Análise
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-sm text-white/60">Cronograma</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-white/10 text-white/50 border-0 text-xs">
              {data.total_posts} conteúdos · {data.period}
            </Badge>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-black">
              IM
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black tracking-tight">
              {schedule.type === 'week' ? 'Cronograma Semanal' : 'Cronograma Mensal'}
            </h1>
            <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-xs">
              Pronto
            </Badge>
          </div>
          <p className="text-white/45 text-sm">
            {schedule.analyses?.niche} · {schedule.analyses?.objective}
          </p>
        </div>

        {/* Days */}
        <div className="space-y-8">
          {data.days.map((day: DaySchedule) => (
            <DayBlock
              key={day.date}
              day={day}
              analysisId={analysisId}
              scheduleId={id}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

function DayBlock({
  day,
  analysisId,
  scheduleId,
}: {
  day: DaySchedule
  analysisId: string
  scheduleId: string
}) {
  const dateObj = new Date(day.date + 'T12:00:00')
  const formatted = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-white/[0.08] rounded-xl px-4 py-2">
          <p className="font-bold text-sm capitalize text-white">{formatted}</p>
        </div>
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="text-xs text-white/25">{day.items.length} item{day.items.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {day.items.map((item: ContentItem) => (
          <ContentCard
            key={item.id}
            item={item}
            analysisId={analysisId}
            scheduleId={scheduleId}
          />
        ))}
      </div>
    </div>
  )
}

function ContentCard({
  item,
  analysisId,
  scheduleId,
}: {
  item: ContentItem
  analysisId: string
  scheduleId: string
}) {
  const typeMap: Record<string, { label: string; cls: string; icon: string }> = {
    post: { label: 'Post', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/20', icon: '📷' },
    reel: { label: 'Reel', cls: 'bg-pink-500/15 text-pink-300 border-pink-500/20', icon: '🎬' },
    story: { label: 'Story', cls: 'bg-purple-500/15 text-purple-300 border-purple-500/20', icon: '⭕' },
    carrossel: { label: 'Carrossel', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/20', icon: '🎠' },
  }
  const t = typeMap[item.type] ?? typeMap.post

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{t.icon}</span>
          <div>
            <Badge className={`text-xs border ${t.cls}`}>{t.label}</Badge>
            <p className="text-white/35 text-xs mt-0.5">{item.time}</p>
          </div>
        </div>
        <span className="text-xs text-white/25 shrink-0">~{item.estimated_reach}</span>
      </div>

      {/* Title + Theme */}
      <div>
        <p className="font-bold text-sm text-white leading-snug">{item.title}</p>
        <p className="text-white/40 text-xs mt-1">{item.theme}</p>
      </div>

      {/* Description */}
      <p className="text-sm text-white/65 leading-relaxed">{item.description}</p>

      {/* Caption (collapsed) */}
      <details className="group">
        <summary className="text-xs text-white/35 hover:text-white/60 cursor-pointer transition-colors list-none flex items-center gap-1">
          <span className="group-open:hidden">▶</span>
          <span className="hidden group-open:inline">▼</span>
          Ver legenda
        </summary>
        <div className="mt-2 p-3 bg-white/[0.04] rounded-xl">
          <p className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">{item.caption}</p>
        </div>
      </details>

      {/* Hashtags */}
      {item.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.hashtags.slice(0, 8).map((tag) => (
            <span key={tag} className="text-xs text-pink-400/70 bg-pink-500/10 rounded-lg px-2 py-0.5">
              #{tag.replace(/^#/, '')}
            </span>
          ))}
          {item.hashtags.length > 8 && (
            <span className="text-xs text-white/25">+{item.hashtags.length - 8}</span>
          )}
        </div>
      )}

      {/* Tips */}
      {item.tips?.length > 0 && (
        <ul className="space-y-1">
          {item.tips.map((tip, i) => (
            <li key={i} className="text-xs text-white/40 flex gap-1.5">
              <span className="shrink-0">💡</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      {item.cta && (
        <p className="text-xs text-green-400/70 border-t border-white/[0.06] pt-3">
          CTA: {item.cta}
        </p>
      )}

      {/* Image gen */}
      {item.visual_description && analysisId && (
        <div className="border-t border-white/[0.06] pt-3">
          <p className="text-xs text-white/30 mb-1">{item.visual_description}</p>
          <ImageGenButton
            analysisId={analysisId}
            scheduleId={scheduleId}
            contentItemId={item.id}
            prompt={item.visual_description}
          />
        </div>
      )}
    </div>
  )
}

function ProcessingView() {
  return (
    <div className="min-h-screen bg-[#080808] text-white font-[family-name:var(--font-outfit)] flex flex-col items-center justify-center px-6">
      <div className="w-12 h-12 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mb-6" />
      <h2 className="text-xl font-black mb-2">Gerando cronograma</h2>
      <p className="text-white/45 text-sm mb-6">A IA está criando seu cronograma. Volte em alguns minutos.</p>
      <Link href="/dashboard">
        <Button className="bg-white/10 hover:bg-white/15 rounded-xl">Voltar ao dashboard</Button>
      </Link>
    </div>
  )
}

function ErrorView() {
  return (
    <div className="min-h-screen bg-[#080808] text-white font-[family-name:var(--font-outfit)] flex flex-col items-center justify-center px-6">
      <div className="text-4xl mb-4">❌</div>
      <h2 className="text-xl font-black mb-2">Cronograma falhou</h2>
      <p className="text-white/45 text-sm mb-6">Ocorreu um erro. Entre em contato com o suporte.</p>
      <Link href="/dashboard">
        <Button className="bg-white/10 hover:bg-white/15 rounded-xl">Voltar ao dashboard</Button>
      </Link>
    </div>
  )
}
