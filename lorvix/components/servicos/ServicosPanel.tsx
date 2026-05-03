'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Save, Pencil, Power, Clock, Tag, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import type { Service } from '@/app/(clinic)/servicos/page'

const CATEGORIES = [
  'Estética Facial', 'Estética Corporal', 'Cabelo', 'Unhas',
  'Odontologia', 'Fisioterapia', 'Nutrição', 'Psicologia',
  'Consulta', 'Massagem', 'Depilação', 'Outro',
]

interface ServiceForm {
  name: string
  description: string
  duration_minutes: number
  price: string
  category: string
}

const EMPTY: ServiceForm = {
  name: '', description: '', duration_minutes: 30, price: '', category: '',
}

interface Props {
  services: Service[]
  clinicId: string
}

export function ServicosPanel({ services, clinicId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceForm>(EMPTY)
  const [error, setError] = useState('')

  function openNew() {
    setSelected(null)
    setForm(EMPTY)
    setError('')
    setShowForm(true)
  }

  function openEdit(s: Service) {
    setSelected(s)
    setForm({
      name:             s.name,
      description:      s.description ?? '',
      duration_minutes: s.duration_minutes,
      price:            s.price != null ? String(s.price) : '',
      category:         s.category ?? '',
    })
    setError('')
    setShowForm(true)
  }

  function handleSave() {
    if (!form.name) { setError('O nome do serviço é obrigatório.'); return }
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      const payload = {
        clinic_id:        clinicId,
        name:             form.name.trim(),
        description:      form.description.trim() || null,
        duration_minutes: Number(form.duration_minutes),
        price:            form.price !== '' ? Number(form.price) : null,
        category:         form.category || null,
      }
      if (selected) {
        await supabase.from('services').update(payload).eq('id', selected.id)
      } else {
        await supabase.from('services').insert({ ...payload, is_active: true })
      }
      router.refresh()
      setShowForm(false)
    })
  }

  function toggleActive(s: Service) {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id)
      router.refresh()
    })
  }

  const active   = services.filter((s) => s.is_active)
  const inactive = services.filter((s) => !s.is_active)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Serviços</h1>
          <p className="text-sm text-white/40">
            {active.length} ativo{active.length !== 1 ? 's' : ''}
            {inactive.length > 0 && ` · ${inactive.length} inativo${inactive.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openNew}
          className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo serviço
        </button>
      </div>

      {/* Empty state */}
      {services.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Tag className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 font-medium mb-1">Nenhum serviço cadastrado</p>
          <p className="text-white/30 text-sm">
            Cadastre os serviços da clínica para exibir nas reservas online.
          </p>
        </div>
      )}

      {/* Active services */}
      {active.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((s) => (
            <ServiceCard key={s.id} service={s} onEdit={openEdit} onToggle={toggleActive} />
          ))}
        </div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-2 px-1">Inativos</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-50">
            {inactive.map((s) => (
              <ServiceCard key={s.id} service={s} onEdit={openEdit} onToggle={toggleActive} />
            ))}
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative glass-strong rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-semibold text-white">
                {selected ? 'Editar serviço' : 'Novo serviço'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Nome do serviço *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Limpeza de pele, Consulta, Massagem..."
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                >
                  <option value="" className="bg-[#1A000A]">Selecione...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#1A000A]">{c}</option>
                  ))}
                </select>
              </div>

              {/* Duração + Preço */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Duração (min)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={form.duration_minutes}
                    onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
                    className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Preço (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price}
                    placeholder="0,00"
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Descreva o serviço para os pacientes..."
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="p-5 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="glass px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="brand-gradient text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                {isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceCard({
  service: s,
  onEdit,
  onToggle,
}: {
  service: Service
  onEdit: (s: Service) => void
  onToggle: (s: Service) => void
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{s.name}</p>
          {s.category && (
            <span className="text-xs text-white/40">{s.category}</span>
          )}
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <button
            onClick={() => onEdit(s)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggle(s)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title={s.is_active ? 'Desativar' : 'Ativar'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {s.description && (
        <p className="text-xs text-white/40 line-clamp-2 mb-3">{s.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-white/50">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {s.duration_minutes} min
        </span>
        {s.price != null && (
          <span className="flex items-center gap-1 text-green-400/80">
            <DollarSign className="w-3 h-3" />
            {formatCurrency(s.price)}
          </span>
        )}
      </div>
    </div>
  )
}
