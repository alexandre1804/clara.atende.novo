'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalysisRefreshPollerClient({ analysisId }: { analysisId: string }) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyze/status?id=${analysisId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'complete' || data.status === 'failed') {
            clearInterval(interval)
            router.refresh()
          }
        }
      } catch {
        // keep polling
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [analysisId, router])

  return null
}
