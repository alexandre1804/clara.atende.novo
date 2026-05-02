'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface Props {
  analysisId: string
  scheduleId: string
  contentItemId: string
  prompt: string
}

export default function ImageGenButton({ analysisId, scheduleId, contentItemId, prompt }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payLoading, setPayLoading] = useState(false)

  async function handleGenerate() {
    setState('loading')
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          analysisId,
          scheduleId,
          contentItemId,
          styleContext: 'Instagram, estilo profissional, alta qualidade, cores vibrantes',
        }),
      })

      if (res.status === 402) {
        setState('idle')
        setShowPayModal(true)
        return
      }

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      setImageUrl(data.url)
      setState('done')
    } catch {
      setState('error')
    }
  }

  async function handlePayImage() {
    setPayLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'image', analysisId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setPayLoading(false)
    }
  }

  if (state === 'done' && imageUrl) {
    return (
      <div className="mt-3">
        <div className="relative aspect-square w-full max-w-[200px] rounded-xl overflow-hidden border border-white/[0.08]">
          <Image src={imageUrl} alt="Imagem gerada" fill className="object-cover" unoptimized />
        </div>
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-xs text-pink-400 hover:text-pink-300 underline underline-offset-2"
        >
          Abrir imagem
        </a>
      </div>
    )
  }

  return (
    <>
      {showPayModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#111] border border-white/[0.10] rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-3xl mb-4">🎨</div>
            <h3 className="font-bold text-white mb-2">Geração de Imagem</h3>
            <p className="text-white/50 text-sm mb-5 leading-relaxed">
              Cada imagem gerada custa R$1. O pagamento é único por imagem.
            </p>
            <Button
              onClick={handlePayImage}
              disabled={payLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 rounded-xl h-11 font-semibold mb-3"
            >
              {payLoading ? 'Redirecionando...' : 'Pagar R$1 e gerar'}
            </Button>
            <button
              onClick={() => setShowPayModal(false)}
              className="text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={state === 'loading'}
        className="mt-2 flex items-center gap-1.5 text-xs text-white/35 hover:text-pink-400 transition-colors disabled:opacity-40"
      >
        <span>{state === 'loading' ? '⏳' : '🎨'}</span>
        <span>{state === 'loading' ? 'Gerando imagem...' : state === 'error' ? 'Tentar novamente' : 'Gerar imagem'}</span>
      </button>
    </>
  )
}
