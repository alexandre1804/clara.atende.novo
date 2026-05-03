'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Search, X, Save, Phone, Mail, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatDate, formatPhone, getInitials, cn } from '@/lib/utils'
import type { Patient } from '@/types'

interface PatientForm {
  full_name: string
  phone: string
  cpf: string
  email: string
  birth_date: string
  address: string
  insurance: string
  notes: string
}

const EMPTY_FORM: PatientForm = {
  full_name: '', phone: '', cpf: '', email: '',
  birth_date: '', address: '', insurance: '', notes: '',
}

interface Props {
  patients: Patient[]
  clinicId: string
}

export function PatientsPanel({ patients, clinicId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Patient | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM)
  const [error, setError] = useState('')

  const filtered = useMemo(
    () => patients.filter((p) =>
      p.full_name.toLowerCase().includes(query.toLowerCase()) ||
      p.phone.includes(query) ||
      (p.cpf ?? '').includes(query),
    ),
    [patients, query],
  )

  function openEdit(p: Patient) {
    setSelected(p)
    setForm({
      full_name: p.full_name,
      phone: p.phone,
      cpf: p.cpf ?? '',
      email: p.email ?? '',
      birth_date: p.birth_date ?? '',
      address: p.address ?? '',
      insurance: p.insurance ?? '',
      notes: p.notes ?? '',
    })
    setShowForm(true)
  }

  function openNew() {
    setSelected(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function handleSave() {
    if (!form.full_name || !form.phone) {
      setError('Nome e telefone são obrigatórios.')
      return
    }
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      const payload = {
        full_name:  form.full_name.trim(),
        phone:      form.phone.replace(/\D/g, ''),
        cpf:        form.cpf.replace(/\D/g, '') || null,
        email:      form.email || null,
        birth_date: form.birth_date || null,
        address:    form.address || null,
        insurance:  form.insurance || null,
        notes:      form.notes || null,
        clinic_id:  clinicId,
      }
      if (selected) {
        await supabase.from('patients').update(payload).eq('id', selected.id)
      } else {
        await supabase.from('patients').insert(payload)
      }
      router.refresh()
      setShowForm(false)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Pacientes</h1>
          <p className="text-sm text-white/40">{patients.length} cadastrados</p>
        </div>
        <button
          onClick={openNew}
          className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo paciente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, telefone ou CPF..."
          className="w-full glass rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 border border-white/0 focus:border"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-white/30 text-sm">
            {query ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}
          </div>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => openEdit(p)}
            className="glass rounded-xl px-4 py-3 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 brand-gradient rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
              {getInitials(p.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{p.full_name}</p>
              <p className="text-xs text-white/40 flex items-center gap-2 mt-0.5">
                <Phone className="w-3 h-3" />
                {formatPhone(p.phone)}
                {p.insurance && <span className="glass rounded px-1.5 py-0.5">{p.insurance}</span>}
              </p>
            </div>
            <div className="text-xs text-white/30 hidden sm:block">
              {formatDate(p.created_at)}
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative glass-strong rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-semibold text-white">
                {selected ? 'Editar paciente' : 'Novo paciente'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {[
                { key: 'full_name', label: 'Nome completo *', placeholder: 'João da Silva' },
                { key: 'phone', label: 'Telefone (WhatsApp) *', placeholder: '(27) 99999-9999' },
                { key: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
                { key: 'email', label: 'E-mail', placeholder: 'paciente@email.com' },
                { key: 'birth_date', label: 'Data de nascimento', placeholder: '', type: 'date' },
                { key: 'insurance', label: 'Convênio', placeholder: 'Unimed, Bradesco...' },
                { key: 'address', label: 'Endereço', placeholder: 'Rua, número, bairro' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">{label}</label>
                  <input
                    type={type ?? 'text'}
                    value={form[key as keyof PatientForm]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 [color-scheme:dark]"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Alergias, histórico relevante..."
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
