'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, CheckCircle2, WifiOff, Loader2, Smartphone } from 'lucide-react'

type ConnectionState = 'loading' | 'open' | 'connecting' | 'disconnected' | 'not_configured' | 'error'

const STATE_INFO: Record<ConnectionState, { label: string; color: string; icon: React.ReactNode }> = {
  loading:        { label: 'Verificando...',  color: 'text-white/40',   icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  open:           { label: 'Conectado',       color: 'text-green-400',  icon: <CheckCircle2 className="w-4 h-4" /> },
  connecting:     { label: 'Aguardando QR...', color: 'text-yellow-400', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  disconnected:   { label: 'Desconectado',    color: 'text-red-400',    icon: <WifiOff className="w-4 h-4" /> },
  not_configured: { label: 'Não configurado', color: 'text-white/40',   icon: <WifiOff className="w-4 h-4" /> },
  error:          { label: 'Erro de conexão', color: 'text-red-400',    icon: <WifiOff className="w-4 h-4" /> },
}

export function WhatsappConnect() {
  const [state, setState]       = useState<ConnectionState>('loading')
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [qrError, setQrError]   = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/clinic/whatsapp/status')
      const data = await res.json()
      const newState: ConnectionState = data.state === 'open' ? 'open'
        : data.state === 'connecting' ? 'connecting'
        : data.state === 'not_configured' ? 'not_configured'
        : 'disconnected'
      setState(newState)
      // Se conectou, limpa o QR
      if (newState === 'open') {
        setQrBase64(null)
        setPairingCode(null)
      }
    } catch {
      setState('error')
    }
  }, [])

  const fetchQr = useCallback(async () => {
    setLoadingQr(true)
    setQrError(null)
    setQrBase64(null)
    try {
      const res = await fetch('/api/clinic/whatsapp/qr')
      const data = await res.json()
      if (!res.ok) {
        setQrError(data.error ?? 'Erro ao buscar QR code.')
      } else {
        setQrBase64(data.base64 ?? null)
        setPairingCode(data.pairingCode ?? null)
        setState('connecting')
      }
    } catch {
      setQrError('Não foi possível conectar ao servidor.')
    } finally {
      setLoadingQr(false)
    }
  }, [])

  // Verificação inicial de status
  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Polling: verifica status a cada 5s enquanto aguarda conexão
  useEffect(() => {
    if (state !== 'connecting' && state !== 'loading') return
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [state, checkStatus])

  // QR expira em ~60s — busca novo automaticamente
  useEffect(() => {
    if (state !== 'connecting' || !qrBase64) return
    const timeout = setTimeout(() => {
      if (state === 'connecting') fetchQr()
    }, 55000)
    return () => clearTimeout(timeout)
  }, [qrBase64, state, fetchQr])

  const info = STATE_INFO[state]

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-medium ${info.color}`}>
          {info.icon}
          {info.label}
        </div>
        <button
          onClick={checkStatus}
          className="glass rounded-lg p-1.5 text-white/40 hover:text-white transition-all"
          title="Atualizar status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Conectado */}
      {state === 'open' && (
        <div className="glass rounded-2xl p-6 text-center border border-green-500/20 bg-green-500/5">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-white font-semibold">WhatsApp conectado!</p>
          <p className="text-white/50 text-sm mt-1">
            O agente IA está ativo e pronto para atender.
          </p>
        </div>
      )}

      {/* Não configurado */}
      {state === 'not_configured' && (
        <div className="glass rounded-2xl p-5 border border-white/10 text-center">
          <p className="text-white/50 text-sm">
            Preencha a <strong className="text-white/70">URL da API</strong> e o <strong className="text-white/70">nome da instância</strong> acima e salve antes de conectar.
          </p>
        </div>
      )}

      {/* Desconectado — botão para gerar QR */}
      {(state === 'disconnected' || state === 'error') && (
        <div className="glass rounded-2xl p-5 text-center space-y-4">
          <Smartphone className="w-8 h-8 text-white/30 mx-auto" />
          <div>
            <p className="text-white/70 text-sm font-medium">WhatsApp não conectado</p>
            <p className="text-white/40 text-xs mt-1">
              Clique abaixo para gerar o QR code e escanear com o WhatsApp da clínica.
            </p>
          </div>
          <button
            onClick={fetchQr}
            disabled={loadingQr}
            className="brand-gradient brand-glow text-white text-sm font-semibold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loadingQr
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando QR...</>
              : <><Smartphone className="w-4 h-4" /> Conectar WhatsApp</>
            }
          </button>
          {qrError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {qrError}
            </p>
          )}
        </div>
      )}

      {/* QR Code */}
      {state === 'connecting' && (
        <div className="glass rounded-2xl p-5 text-center space-y-4">
          <div>
            <p className="text-white font-semibold text-sm">Escaneie o QR code</p>
            <p className="text-white/40 text-xs mt-1">
              Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
            </p>
          </div>

          {loadingQr ? (
            <div className="w-52 h-52 mx-auto flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
            </div>
          ) : qrBase64 ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrBase64}
                alt="QR Code WhatsApp"
                className="w-52 h-52 rounded-xl border-4 border-white/10 bg-white"
              />
              <p className="text-white/30 text-xs">QR expira em ~60 segundos</p>
              <button
                onClick={fetchQr}
                className="glass rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-white inline-flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Gerar novo QR
              </button>
            </div>
          ) : qrError ? (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {qrError}
            </p>
          ) : null}

          {/* Pairing code alternativo */}
          {pairingCode && (
            <div className="glass-sm rounded-xl p-3">
              <p className="text-xs text-white/40 mb-1">Código de pareamento (alternativa ao QR)</p>
              <p className="text-lg font-mono font-bold text-white tracking-widest">{pairingCode}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
