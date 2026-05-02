import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import NewAnalysisForm from './_components/NewAnalysisForm'
import PostPaymentHandler from './_components/PostPaymentHandler'
import CreditBalance from './_components/CreditBalance'
import type { InstagramProfile, Analysis } from '@/types'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: analyses }] = await Promise.all([
    supabase
      .from('instagram_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const ig = profile as InstagramProfile | null
  const analysisRows = (analyses ?? []) as Analysis[]

  const isSuccess = params.success === '1'
  const isCanceled = params.canceled === '1'
  const isIGConnected = params.ig_connected === '1'
  const isIGError = !!params.ig_error
  const postPayType = params.type ?? ''
  const postPayAid = params.aid ?? ''
  const postPaySid = params.sid ?? ''

  async function signOut() {
    'use server'
    const sb = await createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white font-[family-name:var(--font-outfit)]">
      {/* Post-payment overlay */}
      {isSuccess && postPayType && (postPayAid || postPaySid) && (
        <PostPaymentHandler
          type={postPayType}
          analysisId={postPayAid || undefined}
          scheduleId={postPaySid || undefined}
        />
      )}

      {/* NAV */}
      <nav className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-black">
              IM
            </div>
            <span className="font-bold tracking-tight">InstaMax</span>
          </Link>
          <div className="flex items-center gap-4">
            <CreditBalance />
            <span className="text-sm text-white/40 hidden sm:block">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-sm text-white/35 hover:text-white/70 transition-colors">
                Sair
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Alerts */}
        {isCanceled && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-300">
            Pagamento cancelado. Nenhuma cobrança foi feita.
          </div>
        )}
        {isIGConnected && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-300">
            Instagram conectado com sucesso!
          </div>
        )}
        {isIGError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
            Erro ao conectar o Instagram. Tente novamente.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* LEFT — analyses list */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-black tracking-tight">Minhas análises</h1>
            </div>

            {analysisRows.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-2xl">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-white/40 text-sm">
                  Nenhuma análise ainda.<br />Conecte seu Instagram e inicie uma análise.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysisRows.map(a => (
                  <AnalysisRow key={a.id} analysis={a} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — IG status + new analysis */}
          <div className="space-y-4">
            <IGStatusCard profile={ig} />
            {ig && <NewAnalysisForm username={ig.username} />}
          </div>
        </div>
      </main>
    </div>
  )
}

function IGStatusCard({ profile }: { profile: InstagramProfile | null }) {
  if (profile) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          {profile.profile_picture_url ? (
            <Image
              src={profile.profile_picture_url}
              alt={profile.username}
              width={44}
              height={44}
              className="rounded-full"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-lg font-black">
              {profile.username[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-sm">@{profile.username}</p>
            <p className="text-white/40 text-xs">{profile.full_name}</p>
          </div>
          <Badge className="ml-auto bg-green-500/15 text-green-400 border-green-500/20 text-xs">
            Conectado
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatCell label="Seguidores" value={fmtNum(profile.followers_count)} />
          <StatCell label="Seguindo" value={fmtNum(profile.following_count)} />
          <StatCell label="Posts" value={fmtNum(profile.media_count)} />
        </div>
        <a
          href="/api/auth/instagram"
          className="block mt-4 text-center text-xs text-white/25 hover:text-white/50 transition-colors"
        >
          Reconectar Instagram
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white/[0.03] border border-dashed border-white/[0.10] rounded-2xl p-6 text-center">
      <div className="text-3xl mb-3">📸</div>
      <h3 className="font-bold text-sm mb-1">Conecte seu Instagram</h3>
      <p className="text-white/40 text-xs mb-5 leading-relaxed">
        Precisamos acessar seu perfil para gerar a análise.
      </p>
      <a href="/api/auth/instagram">
        <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 rounded-xl h-10 text-sm font-semibold">
          Conectar Instagram
        </Button>
      </a>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.04] rounded-xl p-2.5">
      <p className="font-bold text-sm text-white">{value}</p>
      <p className="text-white/35 text-xs">{label}</p>
    </div>
  )
}

function AnalysisRow({ analysis }: { analysis: Analysis }) {
  const statusMap: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Aguardando', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
    processing: { label: 'Processando', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    complete: { label: 'Concluída', cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
    failed: { label: 'Falhou', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  }
  const s = statusMap[analysis.status] ?? statusMap.failed

  const content = (
    <Card className={`bg-white/[0.03] border-white/[0.06] rounded-2xl transition-all ${analysis.status === 'complete' ? 'hover:border-white/[0.12] cursor-pointer' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white truncate">{analysis.niche}</p>
            <p className="text-white/40 text-xs mt-0.5 truncate">{analysis.objective}</p>
            <p className="text-white/25 text-xs mt-2">
              {new Date(analysis.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={`text-xs ${s.cls}`}>{s.label}</Badge>
            {analysis.analysis_data?.score != null && (
              <span className="text-lg font-black text-white/80">
                {analysis.analysis_data.score}
                <span className="text-xs text-white/30 font-normal">/100</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (analysis.status === 'complete') {
    return <Link href={`/dashboard/analysis/${analysis.id}`}>{content}</Link>
  }

  return content
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
