import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import type { Clinic } from '@/types'
import { redirect } from 'next/navigation'

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAuth()

  const supabase = await createClient()
  const { data: clinic } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', user.clinic_id)
    .single()

  if (!clinic) redirect('/login')
  if (!clinic.is_active) {
    return (
      <div className="bg-dynamic min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-white mb-2">Clínica inativa</h1>
          <p className="text-white/55 text-sm">
            O plano desta clínica está suspenso. Entre em contato com o suporte Lorvix.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-dynamic min-h-screen flex">
      <Sidebar user={user} clinic={clinic as Clinic} />

      <div className="flex-1 lg:ml-60 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass-dark border-b border-white/8 px-6 py-4 flex items-center justify-between">
          <div className="lg:hidden w-10" /> {/* spacer for mobile menu btn */}
          <div className="text-sm text-white/40">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            {user.full_name.split(' ')[0]}
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
