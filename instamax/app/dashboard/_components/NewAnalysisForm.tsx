'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'

const OBJECTIVES = [
  'Crescer seguidores organicamente',
  'Vender produtos ou serviços',
  'Construir autoridade no nicho',
  'Gerar leads e captar clientes',
  'Aumentar engajamento da comunidade',
]

export default function NewAnalysisForm({ username }: { username: string }) {
  const [niche, setNiche] = useState('')
  const [objective, setObjective] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!niche.trim() || !objective) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'analysis', niche: niche.trim(), objective }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Erro ao iniciar pagamento.')
        setLoading(false)
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-base">
          🔍
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Nova Análise de Perfil</h3>
          <p className="text-white/40 text-xs">@{username} conectado</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            Nicho
          </label>
          <input
            type="text"
            required
            value={niche}
            onChange={e => setNiche(e.target.value)}
            placeholder="Ex: Nutrição, Fitness, Moda, Arquitetura..."
            className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pink-500/60 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            Objetivo principal
          </label>
          <div className="grid grid-cols-1 gap-2">
            {OBJECTIVES.map(obj => (
              <button
                key={obj}
                type="button"
                onClick={() => setObjective(obj)}
                className={`text-left px-4 py-2.5 rounded-xl text-sm border transition-all ${
                  objective === obj
                    ? 'border-pink-500/60 bg-pink-500/10 text-white'
                    : 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white/80 hover:border-white/20'
                }`}
              >
                {obj}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button
          type="submit"
          disabled={loading || !niche.trim() || !objective}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 rounded-xl h-12 font-semibold disabled:opacity-40"
        >
          {loading ? 'Redirecionando...' : 'Analisar meu perfil — R$39'}
        </Button>

        <p className="text-center text-xs text-white/25">
          Cronograma semanal incluso · Resultado em minutos
        </p>
      </form>
    </div>
  )
}
