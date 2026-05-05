'use client'

import { useState } from 'react'
import { Bot, Save, X } from 'lucide-react'

interface Props {
  clinicId: string
  clinicName: string
  currentInstructions: string
}

export function AgentPromptModal({ clinicId, clinicName, currentInstructions }: Props) {
  const [open, setOpen]         = useState(false)
  const [instructions, setInstructions] = useState(currentInstructions)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/agent-prompt', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, instructions }),
      })
      const body = await res.json() as { error?: string }
      if (res.ok) {
        setMsg('Salvo!')
        setTimeout(() => setOpen(false), 800)
      } else {
        setMsg(`Erro: ${body.error ?? 'falha'}`)
      }
    } catch {
      setMsg('Erro de rede.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setMsg(null) }}
        title="Editar prompt do agente"
        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
      >
        <Bot className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Prompt do agente IA</p>
                <p className="text-xs text-white/40">{clinicName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={8}
              placeholder="Você é a assistente virtual da [Nome da Clínica]. Seu objetivo é agendar consultas, responder dúvidas sobre horários e serviços disponíveis. Seja sempre cordial e responda em português."
              className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 resize-none"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="brand-gradient text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
              {msg && (
                <span className={`text-xs font-medium ${msg.startsWith('Erro') ? 'text-red-400' : 'text-green-400'}`}>
                  {msg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
