import Link from 'next/link'
import {
  CalendarCheck, MessageSquare, BarChart3, Shield,
  Zap, Users, ArrowRight, Check, Star,
} from 'lucide-react'

const features = [
  {
    icon: CalendarCheck,
    title: 'Agenda Online 24h',
    desc: 'Pacientes agendam pelo WhatsApp ou pela sua página personalizada, a qualquer hora.',
  },
  {
    icon: MessageSquare,
    title: 'IA no WhatsApp',
    desc: 'Agente de IA treinado com o DNA da sua clínica: agenda, responde e confirma sozinho.',
  },
  {
    icon: BarChart3,
    title: 'Gestão Financeira',
    desc: 'Receitas, despesas, inadimplência e relatórios em tempo real no painel.',
  },
  {
    icon: Users,
    title: 'Multi-profissional',
    desc: 'Gerencie vários profissionais com agendas independentes e cores distintas.',
  },
  {
    icon: Shield,
    title: 'Dados Isolados (LGPD)',
    desc: 'Cada clínica tem sua própria base de dados isolada. Auditoria completa.',
  },
  {
    icon: Zap,
    title: 'Lembretes Automáticos',
    desc: 'WhatsApp, SMS ou e-mail com confirmação, lembrete e pesquisa de satisfação.',
  },
]

const plans = [
  {
    name: 'Basic',
    price: 'R$197',
    period: '/mês',
    features: ['Até 2 profissionais', 'Agenda online', 'Painel financeiro', 'Suporte via WhatsApp', 'IA WhatsApp (add-on +R$150)'],
    cta: 'Começar grátis 7 dias',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$397',
    period: '/mês',
    features: ['Até 5 profissionais', 'Tudo do Basic', 'IA WhatsApp inclusa', 'Lembretes automáticos', 'Relatórios avançados'],
    cta: 'Começar grátis 7 dias',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'R$797',
    period: '/mês',
    features: ['Profissionais ilimitados', 'Tudo do Pro', 'Multi-unidade', 'Integração personalizada', 'SLA e suporte prioritário'],
    cta: 'Falar com vendas',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <main className="bg-dynamic min-h-screen text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-dark">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold brand-gradient-text">Lorvix</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#plans" className="hover:text-white transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2">
              Entrar
            </Link>
            <a
              href="#plans"
              className="brand-gradient brand-glow text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-90"
            >
              Testar grátis
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-white/60 mb-8">
          <Star className="w-3 h-3 text-yellow-400" />
          <span>IA respondendo 24h no WhatsApp</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          Sua clínica nunca <br />
          <span className="brand-gradient-text">para de atender</span>
        </h1>

        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
          Sistema de agendamento com IA no WhatsApp para clínicas de estética,
          odonto, fisioterapia e muito mais. Instale em 24h.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#plans"
            className="brand-gradient brand-glow text-white font-semibold px-8 py-4 rounded-2xl text-lg inline-flex items-center gap-2 hover:opacity-90 transition-all"
          >
            Começar grátis 7 dias <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#features"
            className="glass text-white/80 font-medium px-8 py-4 rounded-2xl text-lg hover:bg-white/10 transition-all"
          >
            Ver como funciona
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[['24h', 'IA ativa'], ['0min', 'Setup WhatsApp'], ['100%', 'Dados isolados']].map(
            ([val, label]) => (
              <div key={label} className="glass rounded-2xl p-4">
                <div className="text-2xl font-bold brand-gradient-text">{val}</div>
                <div className="text-xs text-white/50 mt-1">{label}</div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Tudo que sua clínica precisa
        </h2>
        <p className="text-white/50 text-center mb-16">
          Desenvolvido para profissionais de saúde e estética
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 hover:bg-white/10 transition-all group">
              <div className="w-12 h-12 brand-gradient rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Planos simples</h2>
        <p className="text-white/50 text-center mb-16">Sem taxa de setup. Cancele quando quiser.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? 'glass-strong border-2 border-pink-500/30 shadow-[0_0_40px_rgba(155,16,64,0.25)]'
                  : 'glass'
              }`}
            >
              {plan.highlight && (
                <span className="brand-gradient text-white text-xs font-semibold px-3 py-1 rounded-full w-fit mb-4">
                  Mais popular
                </span>
              )}
              <div className="mb-6">
                <div className="text-sm text-white/50 mb-1">{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-white/40 mb-1">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/75">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                plan.highlight
                  ? 'brand-gradient brand-glow text-white hover:opacity-90'
                  : 'glass text-white/80 hover:bg-white/15'
              }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 text-center text-white/30 text-sm">
        <p>© 2026 Lorvix. Todos os direitos reservados.</p>
        <p className="mt-1">
          Desenvolvido por{' '}
          <a href="https://lorvix.com.br" className="hover:text-white/60 transition-colors">
            Lorvix
          </a>
        </p>
      </footer>
    </main>
  )
}
