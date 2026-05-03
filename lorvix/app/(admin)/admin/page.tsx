import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Clinic } from '@/types'
import { Building2, Users, DollarSign, Activity } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Painel Admin — Lorvix' }

export default async function AdminPage() {
  const supabase = createAdminClient()

  const [{ data: clinics }, { count: totalUsers }] = await Promise.all([
    supabase.from('clinics').select('*').order('created_at', { ascending: false }),
    supabase.from('clinic_users').select('*', { count: 'exact', head: true }),
  ])

  const list = (clinics ?? []) as Clinic[]
  const active   = list.filter((c) => c.is_active).length
  const inactive = list.length - active

  const planMap: Record<string, number> = {}
  list.forEach((c) => { planMap[c.plan] = (planMap[c.plan] ?? 0) + 1 })

  const PLAN_PRICE: Record<string, number> = { basic: 197, pro: 397, enterprise: 797 }
  const mrr = list.filter((c) => c.is_active).reduce((s, c) => s + (PLAN_PRICE[c.plan] ?? 0), 0)

  return (
    <div className="bg-dynamic min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold brand-gradient-text">Painel Admin — Lorvix</h1>
          <p className="text-white/50 text-sm mt-1">Visão geral das clínicas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Clínicas ativas',   value: active,          icon: Building2, color: 'text-green-400' },
            { label: 'Clínicas inativas', value: inactive,        icon: Activity,  color: 'text-red-400' },
            { label: 'Total usuários',    value: totalUsers ?? 0, icon: Users,     color: 'text-blue-400' },
            { label: 'MRR estimado',      value: formatCurrency(mrr), icon: DollarSign, color: 'text-yellow-400', isText: true },
          ].map(({ label, value, icon: Icon, color, isText }) => (
            <div key={label} className="glass rounded-2xl p-5">
              <Icon className={`w-5 h-5 ${color} mb-3`} />
              <p className="text-xs text-white/50 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{isText ? value : value}</p>
            </div>
          ))}
        </div>

        {/* Clinics table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Clínicas cadastradas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {['Clínica', 'Slug', 'Plano', 'Status', 'Cadastro'].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs text-white/40 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-white/4 transition-colors">
                    <td className="px-5 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-5 py-3 text-white/50 font-mono text-xs">{c.slug}</td>
                    <td className="px-5 py-3">
                      <span className="glass-sm rounded-full px-2 py-0.5 text-xs capitalize text-white/70">{c.plan}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium ${c.is_active ? 'text-green-400' : 'text-red-400'}`}>
                        {c.is_active ? '● Ativa' : '● Inativa'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && (
              <div className="p-10 text-center text-white/30 text-sm">Nenhuma clínica cadastrada.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
