'use client'

import { useState, useTransition } from 'react'
import { Save, Building2, MessageSquare, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Clinic, WhatsappConfig, NotificationTemplate } from '@/types'
import { WhatsappConnect } from './WhatsappConnect'

const COLOR_PALETTE = [
  '#5C0018', '#7A0022', '#9B1040', '#2563EB',
  '#7C3AED', '#059669', '#D97706', '#0891B2',
]

interface Props {
  clinic: Clinic
  waConfig: WhatsappConfig | null
  templates: NotificationTemplate[]
}

export function SettingsPanel({ clinic, waConfig, templates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'clinic' | 'whatsapp' | 'notifications'>('clinic')

  const [clinicForm, setClinicForm] = useState({
    name: clinic.name,
    phone: clinic.phone ?? '',
    email: clinic.email ?? '',
    address: clinic.address ?? '',
    primary_color: clinic.primary_color,
    secondary_color: clinic.secondary_color,
  })

  const [waForm, setWaForm] = useState({
    instance_name: waConfig?.instance_name ?? '',
    api_url: waConfig?.api_url ?? '',
    agent_name: waConfig?.agent_name ?? 'Assistente',
    agent_instructions: waConfig?.agent_instructions ?? '',
  })

  function saveClinic() {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('clinics').update(clinicForm).eq('id', clinic.id)
      router.refresh()
    })
  }

  function saveWhatsapp() {
    startTransition(async () => {
      const supabase = createClient()
      const payload = { ...waForm, clinic_id: clinic.id }
      if (waConfig) {
        await supabase.from('whatsapp_config').update(payload).eq('id', waConfig.id)
      } else {
        await supabase.from('whatsapp_config').insert({ ...payload, is_active: true })
      }
      router.refresh()
    })
  }

  const TABS = [
    { key: 'clinic' as const, label: 'Clínica', icon: Building2 },
    { key: 'whatsapp' as const, label: 'WhatsApp IA', icon: MessageSquare },
    { key: 'notifications' as const, label: 'Notificações', icon: Bell },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-white/40">Personalize sua clínica</p>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl p-1 flex gap-1 w-fit">
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
            { key: 'name', label: 'Nome da clínica' },
            { key: 'phone', label: 'Telefone' },
            { key: 'email', label: 'E-mail' },
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

          <div>
            <label className="block text-xs text-white/50 mb-2 font-medium">Cor primária</label>
            <div className="flex gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setClinicForm((p) => ({ ...p, primary_color: c }))}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${clinicForm.primary_color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={saveClinic}
            disabled={isPending}
            className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" /> {isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}

      {/* WhatsApp tab */}
      {tab === 'whatsapp' && (
        <div className="glass rounded-2xl p-6 space-y-4 max-w-lg">
          <div className="glass rounded-xl p-4 border border-green-500/20 bg-green-500/5">
            <p className="text-sm text-green-400 font-medium mb-1">Integração n8n + Evolution API</p>
            <p className="text-xs text-white/50">
              Configure sua instância do Evolution API para que o agente IA possa atender no WhatsApp 24h.
            </p>
          </div>

          {[
            { key: 'instance_name', label: 'Nome da instância', placeholder: 'minha-clinica' },
            { key: 'api_url', label: 'URL do Evolution API', placeholder: 'https://api.evolution.meu-servidor.com' },
            { key: 'agent_name', label: 'Nome do agente', placeholder: 'Assistente da Clínica' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">{label}</label>
              <input
                value={waForm[key as keyof typeof waForm]}
                onChange={(e) => setWaForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Instruções do agente</label>
            <textarea
              value={waForm.agent_instructions}
              onChange={(e) => setWaForm((p) => ({ ...p, agent_instructions: e.target.value }))}
              rows={5}
              placeholder="Você é a assistente virtual da [Clínica]. Seu objetivo é agendar consultas e responder dúvidas sobre horários e serviços. Seja sempre cordial e responda em português."
              className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 resize-none"
            />
          </div>

          <button
            onClick={saveWhatsapp}
            disabled={isPending}
            className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" /> {isPending ? 'Salvando...' : 'Salvar configurações'}
          </button>

          {/* Conexão WhatsApp — QR Code */}
          <div className="border-t border-white/10 pt-5">
            <p className="text-sm font-semibold text-white mb-1">Conectar WhatsApp</p>
            <p className="text-xs text-white/40 mb-4">
              Salve as configurações acima antes de conectar. O QR code expira em 60 segundos.
            </p>
            <WhatsappConnect />
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
    </div>
  )
}
