'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  type: string
  analysisId?: string
  scheduleId?: string
}

export default function PostPaymentHandler({ type, analysisId, scheduleId }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'waiting' | 'processing' | 'done' | 'error'>('waiting')
  const [message, setMessage] = useState('Confirmando pagamento...')
  const attempts = useRef(0)
  const maxAttempts = 20

  useEffect(() => {
    if (type === 'analysis' && analysisId) {
      triggerAnalysis(analysisId)
    } else if ((type === 'schedule_week' || type === 'schedule_month') && scheduleId) {
      triggerSchedule(scheduleId)
    } else if (type.startsWith('credits_')) {
      // Créditos já foram adicionados pelo webhook — só mostrar confirmação
      setStatus('done')
      setMessage('Créditos adicionados com sucesso!')
      setTimeout(() => router.replace('/dashboard'), 2000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function triggerAnalysis(id: string) {
    setMessage('Confirmando pagamento...')

    // Retry until webhook fires (payment_id set) or timeout
    while (attempts.current < maxAttempts) {
      attempts.current++
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysisId: id }),
        })

        if (res.ok) {
          setStatus('processing')
          setMessage('IA analisando seu perfil...')
          await pollAnalysis(id)
          return
        }

        if (res.status === 402) {
          // Webhook not fired yet
          await sleep(2000)
          continue
        }

        if (res.status === 200) {
          // Already done
          setStatus('done')
          router.push(`/dashboard/analysis/${id}`)
          return
        }

        throw new Error('Unexpected error')
      } catch {
        await sleep(2000)
      }
    }

    setStatus('error')
    setMessage('Não foi possível iniciar a análise. Recarregue a página.')
  }

  async function pollAnalysis(id: string) {
    for (let i = 0; i < 60; i++) {
      await sleep(3000)
      try {
        const res = await fetch(`/api/analyze/status?id=${id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'complete') {
            setStatus('done')
            router.push(`/dashboard/analysis/${id}`)
            return
          }
          if (data.status === 'failed') {
            setStatus('error')
            setMessage('A análise falhou. Entre em contato com o suporte.')
            return
          }
        }
      } catch {
        // keep polling
      }
    }
    setStatus('error')
    setMessage('Tempo esgotado. Recarregue a página para verificar.')
  }

  async function triggerSchedule(id: string) {
    setMessage('Confirmando pagamento...')

    while (attempts.current < maxAttempts) {
      attempts.current++
      try {
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduleId: id }),
        })

        if (res.ok || res.status === 200) {
          setStatus('processing')
          setMessage('Gerando seu cronograma...')
          await pollSchedule(id)
          return
        }

        if (res.status === 402) {
          await sleep(2000)
          continue
        }

        throw new Error('Unexpected')
      } catch {
        await sleep(2000)
      }
    }

    setStatus('error')
    setMessage('Não foi possível gerar o cronograma. Recarregue a página.')
  }

  async function pollSchedule(id: string) {
    for (let i = 0; i < 60; i++) {
      await sleep(3000)
      try {
        const res = await fetch(`/api/schedule/status?id=${id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'complete') {
            setStatus('done')
            router.push(`/dashboard/schedule/${id}`)
            return
          }
          if (data.status === 'failed') {
            setStatus('error')
            setMessage('O cronograma falhou. Entre em contato com o suporte.')
            return
          }
        }
      } catch {
        // keep polling
      }
    }
    setStatus('error')
    setMessage('Tempo esgotado. Recarregue a página para verificar.')
  }

  if (status === 'done' && message.includes('créditos')) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div className="bg-[#111] border border-green-500/30 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">🎨</div>
          <h3 className="font-bold text-white mb-2">Créditos adicionados!</h3>
          <p className="text-white/50 text-sm">Seus créditos de imagem já estão disponíveis.</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div className="bg-[#111] border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-3xl mb-4">❌</div>
          <h3 className="font-bold text-white mb-2">Algo deu errado</h3>
          <p className="text-white/50 text-sm mb-5">{message}</p>
          <button
            onClick={() => router.refresh()}
            className="text-sm text-pink-400 hover:text-pink-300 underline underline-offset-4"
          >
            Recarregar página
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-[#111] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full border-2 border-pink-500 border-t-transparent animate-spin mx-auto mb-5" />
        <h3 className="font-bold text-white mb-2">
          {status === 'processing' ? 'Processando...' : 'Preparando...'}
        </h3>
        <p className="text-white/50 text-sm">{message}</p>
        <p className="text-white/25 text-xs mt-3">Não feche esta janela</p>
      </div>
    </div>
  )
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
