import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import type { FinancialRecord } from '@/types'
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Financeiro' }

export default async function FinanceiroPage() {
  const { user } = await requireRole(['owner', 'receptionist'])
  const supabase = await createClient()

  const thisMonth = new Date()
  const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().slice(0, 10)
  const endOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { data: records } = await supabase
    .from('financial_records')
    .select('*')
    .eq('clinic_id', user.clinic_id)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)
    .order('date', { ascending: false })

  const list = (records ?? []) as FinancialRecord[]
  const income  = list.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const expense = list.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const balance = income - expense

  const stats = [
    { label: 'Receitas', value: income,   icon: TrendingUp,   color: 'text-green-400',  bg: 'bg-green-500/15' },
    { label: 'Despesas', value: expense,  icon: TrendingDown, color: 'text-red-400',    bg: 'bg-red-500/15' },
    { label: 'Saldo',    value: balance,  icon: DollarSign,   color: balance >= 0 ? 'text-blue-400' : 'text-red-400', bg: 'bg-blue-500/15' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Financeiro</h1>
        <p className="text-sm text-white/40 flex items-center gap-1.5 mt-0.5">
          <Calendar className="w-3.5 h-3.5" />
          {thisMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-xs text-white/50 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold text-white text-sm">Lançamentos do mês</h2>
          <span className="text-xs text-white/40">{list.length} registros</span>
        </div>

        {list.length === 0 ? (
          <div className="p-10 text-center text-white/30 text-sm">Nenhum lançamento este mês.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {list.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm text-white font-medium">{r.description}</p>
                  <p className="text-xs text-white/35 mt-0.5">{r.category} · {r.date}</p>
                </div>
                <span className={`text-sm font-semibold ${r.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
