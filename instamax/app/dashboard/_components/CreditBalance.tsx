'use client'

import { useEffect, useState } from 'react'
import BuyCreditsModal from './BuyCreditsModal'

export default function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetch('/api/credits/balance')
      .then(r => r.json())
      .then(d => setBalance(d.balance ?? 0))
      .catch(() => setBalance(0))
  }, [])

  return (
    <>
      {showModal && <BuyCreditsModal onClose={() => setShowModal(false)} />}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        title="Créditos de imagem — clique para comprar"
      >
        <span>🎨</span>
        <span className="font-semibold text-white/80">
          {balance === null ? '—' : balance}
        </span>
        <span className="text-white/30 text-xs">créditos</span>
      </button>
    </>
  )
}
