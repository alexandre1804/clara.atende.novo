'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, X, Save, Pencil, Power, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import type { Professional } from '@/types'

const SPECIALTY_OPTIONS = [
  'Estética Facial', 'Estética Corporal', 'Tricologia', 'Design de Sobrancelhas',
  'Manicure / Pedicure', 'Odontologia Geral', 'Ortodontia', 'Fisioterapia',
  'Nutrição', 'Psicologia', 'Dermatologia', 'Clínica Geral', 'Outro',
]

const COLOR_PALETTE = [
  '#5C0018', '#7A0022', '#9B1040', '#C41E5A',
  '#2563EB', '#7C3AED', '#059669', '#D97706',
  '#DC2626', '#0891B2', '#BE185D', '#6D28D9',
]

interface ProfForm {
  name: string; specialty: string; bio: string
  phone: string; email: string; color: string
}

const EMPTY: ProfForm = { name: '', specialty: '', bio: '', phone: '', email: '', color: '#5C0018' }

interface Props {
  professionals: Professional[]
  clinicId: string
}

export function ProfessionaisPanel({ professionals, clinicId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Professional | null>(null)
  const [form, setForm] = useState<ProfForm>(EMPTY)
  const [error, setError] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function openNew() {
    setSelected(null)
    setForm(EMPTY)
    setError('')
    setAvatarFile(null)
    setAvatarPreview(null)
    setShowForm(true)
  }

  function openEdit(p: Professional) {
    setSelected(p)
    setForm({ name: p.name, specialty: p.specialty, bio: p.bio ?? '', phone: p.phone ?? '', email: p.email ?? '', color: p.color })
    setError('')
    setAvatarFile(null)
    setAvatarPreview(p.avatar_url ?? null)
    setShowForm(true)
  }

  function handleSave() {
    if (!form.name || !form.specialty) { setError('Nome e especialidade são obrigatórios.'); return }
    setError('')
    startTransition(async () => {
      const supabase = createClient()

      let avatar_url: string | null = selected?.avatar_url ?? null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg'
        const path = `${clinicId}/${selected?.id ?? Date.now()}.${ext}`
        const { data: uploaded } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true })
        if (uploaded) {
          avatar_url = supabase.storage.from('avatars').getPublicUrl(uploaded.path).data.publicUrl
        }
      }

      const payload = {
        clinic_id: clinicId,
        name: form.name,
        specialty: form.specialty,
        bio: form.bio || null,
        phone: form.phone || null,
        email: form.email || null,
        color: form.color,
        avatar_url,
      }
      if (selected) {
        await supabase.from('professionals').update(payload).eq('id', selected.id)
      } else {
        await supabase.from('professionals').insert({ ...payload, is_active: true })
      }
      router.refresh()
      setShowForm(false)
    })
  }

  function toggleActive(p: Professional) {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('professionals').update({ is_active: !p.is_active }).eq('id', p.id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Profissionais</h1>
          <p className="text-sm text-white/40">{professionals.filter((p) => p.is_active).length} ativos</p>
        </div>
        <button onClick={openNew} className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {professionals.map((p) => (
          <div key={p.id} className={`glass rounded-2xl p-5 ${!p.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: p.color }}>
                    {getInitials(p.name)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <p className="text-xs text-white/50">{p.specialty}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleActive(p)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all" title={p.is_active ? 'Desativar' : 'Ativar'}>
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {p.phone && <p className="text-xs text-white/40">{p.phone}</p>}
            {p.bio && <p className="text-xs text-white/35 mt-2 line-clamp-2">{p.bio}</p>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative glass-strong rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-semibold text-white">{selected ? 'Editar profissional' : 'Novo profissional'}</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">

              {/* Foto */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Foto</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl overflow-hidden bg-white/8 border border-white/12 flex items-center justify-center hover:bg-white/15 transition-all shrink-0"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-5 h-5 text-white/30" />
                    )}
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-white/50 hover:text-white transition-all"
                    >
                      {avatarPreview ? 'Trocar foto' : 'Enviar foto'}
                    </button>
                    <p className="text-xs text-white/25 mt-0.5">JPG, PNG ou WebP · máx. 2MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {[
                { key: 'name', label: 'Nome *', placeholder: 'Dra. Ana Lima' },
                { key: 'phone', label: 'Telefone', placeholder: '(27) 99999-9999' },
                { key: 'email', label: 'E-mail', placeholder: 'profissional@email.com' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">{label}</label>
                  <input value={form[key as keyof ProfForm]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50" />
                </div>
              ))}

              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Especialidade *</label>
                <select value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))} className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50">
                  <option value="" className="bg-[#1A000A]">Selecione...</option>
                  {SPECIALTY_OPTIONS.map((s) => <option key={s} value={s} className="bg-[#1A000A]">{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Cor na agenda</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLOR_PALETTE.map((c) => (
                    <button key={c} type="button" onClick={() => setForm((p) => ({ ...p, color: c }))} className={`w-8 h-8 rounded-lg border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`} style={{ background: c }} />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Bio / Apresentação</label>
                <textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} rows={2} placeholder="Breve apresentação exibida na página de agendamento..." className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 resize-none" />
              </div>

              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="p-5 border-t border-white/10 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="glass px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={isPending} className="brand-gradient text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all">
                <Save className="w-4 h-4" />{isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
