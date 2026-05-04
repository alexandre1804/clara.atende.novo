'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Building2, Eye, EyeOff } from 'lucide-react'

const PLANS = [
  { value: 'basic',      label: 'Basic — R$197/mês' },
  { value: 'pro',        label: 'Pro — R$397/mês' },
  { value: 'enterprise', label: 'Enterprise — R$797/mês' },
]

export function NovaClinicaModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', slug: '', plan: 'pro',
    ownerName: '', ownerEmail: '', ownerPassword: '',
  })

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }))
  }

  function autoSlug(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setForm((p) => ({ ...p, name, slug: autoSlug(name) }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = await fetch('/api/admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { ok?: boolean; error?: string; slug?: string; instanceName?: string; whatsappReady?: boolean }
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar clínica.')
        return
      }
      const waNote = data.whatsappReady
        ? ` • Instância WhatsApp "${data.instanceName}" criada — escaneie o QR nas configurações.`
        : ' • Configure o WhatsApp nas configurações da clínica.'
      setSuccess(`Clínica criada! Acesso: ${data.slug}.lorvix.com.br/login${waNote}`)
      setForm({ name: '', slug: '', plan: 'pro', ownerName: '', ownerEmail: '', ownerPassword: '' })
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); setSuccess(null) }}
        className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 hover:opacity-90 transition-all"
      >
        <Plus className="w-4 h-4" /> Nova Clínica
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,4,7,0.92)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-white/60" />
                <h2 className="font-semibold text-white">Nova Clínica</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3">
              {/* Clinic info */}
              <p className="text-xs text-white/40 font-medium uppercase tracking-wide pt-1">Dados da Clínica</p>

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Nome da clínica *</label>
                <input value={form.name} onChange={handleNameChange} required placeholder="Clínica Dr. Silva"
                  autoComplete="off"
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50" />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Slug (subdomínio) *</label>
                <div className="flex items-center gap-1">
                  <input value={form.slug} onChange={field('slug')} required placeholder="dr-silva"
                    autoComplete="off"
                    className="flex-1 bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 font-mono" />
                  <span className="text-xs text-white/30 whitespace-nowrap">.lorvix.com.br</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Plano</label>
                <select value={form.plan} onChange={field('plan')}
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50">
                  {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {/* Owner info */}
              <p className="text-xs text-white/40 font-medium uppercase tracking-wide pt-2">Usuário Owner</p>

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Nome completo *</label>
                <input value={form.ownerName} onChange={field('ownerName')} required placeholder="Dr. João Silva"
                  autoComplete="off"
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50" />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5">E-mail *</label>
                <input type="email" value={form.ownerEmail} onChange={field('ownerEmail')} required placeholder="dono@clinica.com"
                  autoComplete="off"
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50" />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Senha inicial *</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.ownerPassword} onChange={field('ownerPassword')} required minLength={8} placeholder="mín. 8 caracteres"
                    autoComplete="new-password"
                    className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
              {success && (
                <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{success}</p>
              )}

              <button type="submit" disabled={isPending}
                className="w-full brand-gradient brand-glow text-white font-semibold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-all mt-2">
                {isPending ? 'Criando...' : 'Criar Clínica'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
