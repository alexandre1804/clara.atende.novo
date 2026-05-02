'use client'

import { useState } from 'react'
import Image from 'next/image'
import BuyCreditsModal from '@/app/dashboard/_components/BuyCreditsModal'

interface Props {
  analysisId: string
  scheduleId: string
  contentItemId: string
  prompt: string
}

type State = 'idle' | 'loading' | 'done' | 'error'

export default function ImageGenButton({ analysisId, scheduleId, contentItemId, prompt }: Props) {
  const [state, setState] = useState<State>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showBuyModal, setShowBuyModal] = useState(false)

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
          styleContext: 'Instagram, estilo profissional, alta qualidade, cores vibrantes, formato quadrado',
        }),
      })

      if (res.status === 402) {
        setState('idle')
        setShowBuyModal(true)
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

  if (state === 'done' && imageUrl) {
    return (
      <div className="mt-2">
        <div className="relative aspect-square w-36 rounded-xl overflow-hidden border border-white/[0.08]">
          <Image src={imageUrl} alt="Imagem gerada" fill className="object-cover" unoptimized />
        </div>
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-1.5 text-xs text-pink-400 hover:text-pink-300 underline underline-offset-2"
        >
          Abrir em tamanho original
        </a>
      </div>
    )
  }

  return (
    <>
      {showBuyModal && <BuyCreditsModal onClose={() => setShowBuyModal(false)} />}

      <button
        onClick={handleGenerate}
        disabled={state === 'loading'}
        className="mt-2 flex items-center gap-1.5 text-xs text-white/35 hover:text-pink-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span>{state === 'loading' ? '⏳' : state === 'error' ? '⚠️' : '🎨'}</span>
        <span>
          {state === 'loading' && 'Gerando imagem...'}
          {state === 'error' && 'Erro — tentar novamente'}
          {(state === 'idle') && 'Gerar imagem (1 crédito)'}
        </span>
      </button>
    </>
  )
}
