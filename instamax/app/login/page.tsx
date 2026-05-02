'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError('Não foi possível enviar o link. Tente novamente.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white font-[family-name:var(--font-outfit)] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-sm font-black">
            IM
          </div>
          <span className="font-bold text-lg tracking-tight">InstaMax</span>
          <Badge variant="secondary" className="text-xs bg-white/10 text-white/60 border-0">
            by Lorvix
          </Badge>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {!sent ? (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-2xl font-black mx-auto mb-5">
                  IM
                </div>
                <h1 className="text-2xl font-black tracking-tight mb-2">
                  Entrar no InstaMax
                </h1>
                <p className="text-white/45 text-sm">
                  Enviaremos um link mágico para seu e-mail.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pink-500/60 transition-colors"
                />

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 rounded-xl h-12 font-semibold disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar link de acesso'}
                </Button>
              </form>

              <p className="text-center text-xs text-white/25 mt-6">
                Sem senha. Acesso seguro por e-mail.
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-6 text-3xl">
                📬
              </div>
              <h2 className="text-2xl font-black mb-3">Verifique seu e-mail</h2>
              <p className="text-white/45 text-sm leading-relaxed mb-6">
                Enviamos um link de acesso para{' '}
                <span className="text-white/70 font-medium">{email}</span>.
                <br />Clique no link para entrar no InstaMax.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-white/30 hover:text-white/60 transition-colors underline underline-offset-4"
              >
                Usar outro e-mail
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
