'use client'

import { useState, useTransition } from 'react'
import { Save, Building2, MessageSquare, Bell, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Clinic, WhatsappConfig, NotificationTemplate } from '@/types'
import { WhatsappConnect } from './WhatsappConnect'
import { EquipeTab } from './EquipeTab'

const PALETTE = [
  { value: '#FFFFFF', label: 'Branco'    },
  { value: '#111111', label: 'Preto'     },
  { value: '#5C0018', label: 'Bordô'     },
  { value: '#C41E5A', label: 'Carmim'    },
  { value: '#BE185D', label: 'Pink'      },
  { value: '#DC2626', label: 'Vermelho'  },
  { value: '#EA580C', label: 'Laranja'   },
  { value: '#B45309', label: 'Âmbar'     },
  { value: '#C8A87A', label: 'Creme'     },
  { value: '#047857', label: 'Verde'     },
  { value: '#0E7490', label: 'Ciano'     },
  { value: '#1D4ED8', label: 'Azul'      },
  { value: '#6D28D9', label: 'Violeta'   },
  { value: '#9333EA', label: 'Roxo'      },
]

interface Props {
  clinic: Clinic
  waConfig: WhatsappConfig | null
  templates: NotificationTemplate[]
}

export function SettingsPanel({ clinic, waConfig, templates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'clinic' | 'whatsapp' | 'notifications' | 'equipe'>('clinic')

  const [clinicForm, setClinicForm] = useState({
    name: clinic.name,
    phone: clinic.phone ?? '',
    email: clinic.email ?? '',
    address: clinic.address ?? '',
    primary_color: clinic.primary_color,
    secondary_color: clinic.secondary_color,
  })

  const [agentActive, setAgentActive]   = useState(waConfig?.is_active   ?? false)
  const [autoBooking, setAutoBooking]   = useState((waConfig as (typeof waConfig & { auto_booking?: boolean }) | null)?.auto_booking ?? false)
  const [clinicSaveMsg, setClinicSaveMsg] = useState<string | null>(null)

  function saveAgentSettings() {
    if (!waConfig) return
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('whatsapp_config').update({
        is_active:    agentActive,
        auto_booking: autoBooking,
      }).eq('id', waConfig.id)
      router.refresh()
    })
  }

  function saveClinic() {
    setClinicSaveMsg(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/clinic/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clinicForm),
        })
        if (res.ok) {
          setClinicSaveMsg('Salvo com sucesso!')
          router.refresh()
        } else {
          const body = await res.json() as { error?: string }
          setClinicSaveMsg(`Erro ${res.status}: ${body.error ?? 'falha ao salvar'}`)
        }
      } catch {
        setClinicSaveMsg('Erro de rede ao salvar.')
      }
    })
  }

  const TABS = [
    { key: 'clinic' as const,        label: 'Clínica',      icon: Building2 },
    { key: 'whatsapp' as const,      label: 'WhatsApp IA',  icon: MessageSquare },
    { key: 'notifications' as const, label: 'Notificações', icon: Bell },
    { key: 'equipe' as const,        label: 'Equipe',       icon: Users },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-white/40">Personalize sua clínica</p>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'brand-gradient text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Clinic tab */}
      {tab === 'clinic' && (
        <div className="glass rounded-2xl p-6 space-y-4 max-w-lg">
          {[
            { key: 'name',    label: 'Nome da clínica' },
            { key: 'phone',   label: 'Telefone' },
            { key: 'email',   label: 'E-mail' },
            { key: 'address', label: 'Endereço' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">{label}</label>
              <input
                value={clinicForm[key as keyof typeof clinicForm]}
                onChange={(e) => setClinicForm((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              />
            </div>
          ))}

          {/* Cor de fundo */}
          <div>
            <label className="block text-xs text-white/50 mb-1 font-medium">Cor de fundo</label>
            <p className="text-xs text-white/30 mb-2">Base das superfícies — cards, sidebar, fundo</p>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map(({ value, label }) => (
                <button
                  key={`bg-${value}`}
                  title={label}
                  onClick={() => setClinicForm((p) => ({ ...p, primary_color: value }))}
                  className={`w-9 h-9 rounded-xl border-2 transition-all ${clinicForm.primary_color === value ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ background: value, boxShadow: value === '#FFFFFF' ? 'inset 0 0 0 1px rgba(255,255,255,0.3)' : undefined }}
                />
              ))}
            </div>
            <p className="text-xs text-white/25 mt-1.5 font-mono">{clinicForm.primary_color}</p>
          </div>

          {/* Cor de frente */}
          <div>
            <label className="block text-xs text-white/50 mb-1 font-medium">Cor de frente</label>
            <p className="text-xs text-white/30 mb-2">Botões, itens ativos e destaques</p>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map(({ value, label }) => (
                <button
                  key={`fg-${value}`}
                  title={label}
                  onClick={() => setClinicForm((p) => ({ ...p, secondary_color: value }))}
                  className={`w-9 h-9 rounded-xl border-2 transition-all ${clinicForm.secondary_color === value ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ background: value, boxShadow: value === '#FFFFFF' ? 'inset 0 0 0 1px rgba(255,255,255,0.3)' : undefined }}
                />
              ))}
            </div>
            <p className="text-xs text-white/25 mt-1.5 font-mono">{clinicForm.secondary_color}</p>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-white/8" style={{ background: `color-mix(in srgb, ${clinicForm.primary_color} 20%, #111)` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: clinicForm.secondary_color }}>
              {clinic.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 font-medium truncate">{clinic.name}</p>
              <p className="text-[10px] text-white/35">Preview das cores</p>
            </div>
            <div className="px-3 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: clinicForm.secondary_color }}>
              Botão
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={saveClinic}
              disabled={isPending}
              className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" /> {isPending ? 'Salvando...' : 'Salvar'}
            </button>
            {clinicSaveMsg && (
              <span className={`text-xs font-medium ${clinicSaveMsg.startsWith('Erro') ? 'text-red-400' : 'text-green-400'}`}>
                {clinicSaveMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp tab */}
      {tab === 'whatsapp' && (
        <div className="glass rounded-2xl p-6 space-y-6 max-w-lg">

          {/* Conectar WhatsApp */}
          <div>
            <p className="text-sm font-semibold text-white mb-1">Conexão WhatsApp</p>
            <p className="text-xs text-white/40 mb-4">
              Escaneie o QR code com o WhatsApp da clínica para ativar o atendimento via IA.
            </p>
            <WhatsappConnect />
          </div>

          {/* Toggles: ligar agente + agendamento automático */}
          <div className="border-t border-white/10 pt-5 space-y-3">
            <p className="text-sm font-semibold text-white">Automação</p>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm text-white/80">Agente ativo</p>
                <p className="text-xs text-white/40">O agente responde mensagens no WhatsApp</p>
              </div>
              <button
                onClick={() => setAgentActive((v) => !v)}
                className={`w-11 h-6 rounded-full transition-all relative ${agentActive ? 'brand-gradient' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${agentActive ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm text-white/80">Agendamento automático</p>
                <p className="text-xs text-white/40">IA pode criar, remarcar e cancelar consultas</p>
              </div>
              <button
                onClick={() => setAutoBooking((v) => !v)}
                className={`w-11 h-6 rounded-full transition-all relative ${autoBooking ? 'brand-gradient' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${autoBooking ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>

            {waConfig ? (
              <button
                onClick={saveAgentSettings}
                disabled={isPending}
                className="brand-gradient text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" /> {isPending ? 'Salvando...' : 'Salvar'}
              </button>
            ) : (
              <p className="text-xs text-white/30">Conecte o WhatsApp acima para salvar.</p>
            )}
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {tab === 'notifications' && (
        <div className="glass rounded-2xl p-6 max-w-2xl">
          <p className="text-sm text-white/50 mb-4">
            Templates de mensagens enviadas automaticamente. Use {'{nome}'}, {'{data}'}, {'{hora}'}, {'{profissional}'} como variáveis.
          </p>
          {templates.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">
              Nenhum template configurado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="glass-sm rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-white/70 capitalize">{t.type} · {t.channel}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                      {t.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 font-mono">{t.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Equipe tab */}
      {tab === 'equipe' && <EquipeTab />}
    </div>
  )
}
