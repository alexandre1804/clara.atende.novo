'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import type { ClinicUser, Clinic } from '@/types'
import {
  CalendarCheck, Users, UserSquare2,
  Settings, LogOut, Menu, X, LayoutList, Clock,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/agenda',        label: 'Agenda',        icon: CalendarCheck },
  { href: '/pacientes',     label: 'Pacientes',     icon: Users },
  { href: '/profissionais', label: 'Profissionais', icon: UserSquare2 },
  { href: '/servicos',      label: 'Serviços',      icon: LayoutList },
  { href: '/horarios',      label: 'Horários',      icon: Clock },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  user: ClinicUser
  clinic: Clinic
}

export function Sidebar({ user, clinic }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const initials = getInitials(user.full_name)

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 glass rounded-xl p-2 text-white"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'glass-sidebar fixed left-0 top-0 h-screen w-60 z-40 flex flex-col transition-transform duration-300',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand accent strip */}
        <div className="h-1 brand-gradient" />

        {/* Clinic header */}
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${clinic.primary_color}, ${clinic.secondary_color})` }}
            >
              {clinic.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{clinic.name}</p>
              <p className="text-xs text-white/40 truncate capitalize">{clinic.plan}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'brand-gradient text-white shadow-[0_0_20px_rgba(92,0,24,0.4)]'
                    : 'text-white/55 hover:text-white hover:bg-white/8',
                )}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm text-white/80 truncate font-medium">{user.full_name}</p>
              <p className="text-xs text-white/35 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
