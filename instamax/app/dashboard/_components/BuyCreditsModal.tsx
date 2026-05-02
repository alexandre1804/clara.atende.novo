'use client'

import { useState } from 'react'
import { CREDIT_PACKS } from '@/types'
import type { CreditPack } from '@/types'

interface Props {
  onClose: () => void
}

export default function BuyCreditsModal({ onClose }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleBuy(pack: CreditPack) {
    setLoading(pack.type)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: pack.type }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0f0f0f] border border-white/[0.10] rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-white text-lg">Comprar créditos</h3>
            <p className="text-white/40 text-xs mt-0.5">1 crédito = 1 imagem gerada por IA</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {CREDIT_PACKS.map(pack => (
            <button
              key={pack.type}
              onClick={() => handleBuy(pack)}
              disabled={!!loading}
              className={`w-full text-left rounded-xl border p-4 transition-all disabled:opacity-50 ${
                pack.highlight
                  ? 'border-pink-500/50 bg-pink-500/[0.07] hover:bg-pink-500/[0.12]'
                  : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-xl font-black ${pack.highlight ? 'text-white' : 'text-white/70'}`}>
                    {pack.priceFormatted}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${pack.highlight ? 'text-white' : 'text-white/80'}`}>
                        {pack.credits} créditos
                      </span>
                      {pack.highlight && (
                        <span className="text-xs bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-full px-2 py-0.5">
                          Mais popular
                        </span>
                      )}
                    </div>
                    <span className="text-white/35 text-xs">{pack.perCredit}</span>
                  </div>
                </div>

                <div className={`text-sm font-semibold shrink-0 ${
                  loading === pack.type ? 'text-white/40' : pack.highlight ? 'text-pink-400' : 'text-white/50'
                }`}>
                  {loading === pack.type ? '...' : 'Comprar →'}
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-white/20 mt-4">
          Créditos não expiram · Pagamento seguro via Stripe
        </p>
      </div>
    </div>
  )
}
