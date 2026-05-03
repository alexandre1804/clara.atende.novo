'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, X, Save, Trash2, Eye, EyeOff } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface TeamUser {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

const ROLE_LABEL: Record<string, string> = {
  owner:        'Proprietário',
  receptionist: 'Recepcionista',
  doctor:       'Profissional',
}

interface NewUserForm {
  full_name: string
  email: string
  password: string
  role: 'receptionist' | 'doctor'
}

const EMPTY_FORM: NewUserForm = { full_name: '', email: '', password: '', role: 'receptionist' }

export function EquipeTab() {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clinic/users')
      const data = await res.json() as { users?: TeamUser[] }
      setUsers(data.users ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleCreate() {
    if (!form.full_name || !form.email || !form.password) {
      setError('Nome, e-mail e senha são obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/clinic/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar usuário.')
    } else {
      setShowForm(false)
      setForm(EMPTY_FORM)
      fetchUsers()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este usuário? Ele perderá o acesso ao sistema.')) return
    setDeletingId(id)
    await fetch('/api/clinic/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeletingId(null)
    fetchUsers()
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Equipe</p>
          <p className="text-xs text-white/40">Usuários com acesso ao sistema</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError('') }}
          className="brand-gradient text-white text-xs font-semibold px-3 py-2 rounded-xl inline-flex items-center gap-1.5 hover:opacity-90 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Novo usuário
        </button>
      </div>

      {loading ? (
        <p className="text-white/30 text-sm py-4 text-center">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="glass-sm rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 brand-gradient rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0">
                {getInitials(u.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{u.full_name}</p>
                <p className="text-xs text-white/40 truncate">{u.email}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full glass text-white/60 shrink-0">
                {ROLE_LABEL[u.role] ?? u.role}
              </span>
              {u.role !== 'owner' && (
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={deletingId === u.id}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                  title="Remover usuário"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative glass-strong rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="font-semibold text-white">Novo usuário</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Nome completo *</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Ana Lima"
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="ana@clinica.com"
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Senha provisória *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="mín. 8 caracteres"
                    className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Função</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as NewUserForm['role'] }))}
                  className="w-full bg-white/8 border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                >
                  <option value="receptionist" className="bg-[#1A000A]">Recepcionista</option>
                  <option value="doctor" className="bg-[#1A000A]">Profissional / Doutor</option>
                </select>
              </div>
              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
            <div className="p-5 border-t border-white/10 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="glass px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-all">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="brand-gradient text-white text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Criando...' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
