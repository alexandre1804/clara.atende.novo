'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { PurchaseType } from '@/types'

const LABELS: Record<string, string> = {
  schedule_week: 'Comprar Semanal — R$19',
  schedule_month: 'Comprar Mensal — R$29',
}

export default function BuyScheduleButton({
  analysisId,
  type,
}: {
  analysisId: string
  type: PurchaseType
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, analysisId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 rounded-xl h-10 text-sm disabled:opacity-50"
    >
      {loading ? 'Redirecionando...' : LABELS[type] ?? 'Comprar'}
    </Button>
  )
}
