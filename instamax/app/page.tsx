import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white font-[family-name:var(--font-outfit)]">

      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-sm font-black">IM</div>
          <span className="font-bold text-lg tracking-tight">InstaMax</span>
          <Badge variant="secondary" className="text-xs bg-white/10 text-white/60 border-0">by Lorvix</Badge>
        </div>
        <Link href="/login">
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 rounded-full px-6">
            Começar agora
          </Button>
        </Link>
      </nav>

      {/* HERO */}
      <section className="text-center px-6 pt-20 pb-24 max-w-4xl mx-auto">
        <Badge className="mb-6 bg-pink-500/10 text-pink-400 border-pink-500/20 px-4 py-1.5">
          ✦ Consultoria de Instagram com IA
        </Badge>
        <h1 className="text-5xl md:text-6xl font-black leading-[1.08] tracking-tight mb-6">
          Pare de postar no escuro.<br />
          <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Cresça com estratégia.
          </span>
        </h1>
        <p className="text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed">
          O InstaMax analisa seu perfil, identifica o que está travando seu crescimento e gera um cronograma completo com cada post, reel e story detalhado — pronto para executar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 rounded-full px-10 text-base font-semibold h-14">
              Analisar meu perfil — R$39
            </Button>
          </Link>
        </div>
        <p className="text-sm text-white/30 mt-5">Cronograma da semana incluso na análise · Sem assinatura</p>
      </section>

      {/* COMO FUNCIONA */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <p className="text-center text-xs font-bold tracking-[0.2em] text-white/30 uppercase mb-4">Como funciona</p>
        <h2 className="text-center text-3xl font-black mb-14 tracking-tight">
          Da análise ao cronograma em <span className="text-pink-400">minutos</span>
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { num: '01', title: 'Conecta o Instagram', desc: 'Login seguro via Meta. Seus dados ficam protegidos.' },
            { num: '02', title: 'Informa nicho e objetivo', desc: 'Crescimento, vendas, autoridade — você define a meta.' },
            { num: '03', title: 'IA faz a análise', desc: 'GPT-4o analisa perfil, posts, engajamento e posicionamento.' },
            { num: '04', title: 'Recebe o cronograma', desc: 'Post, reel e story detalhados com legenda e hashtags prontos.' },
          ].map(step => (
            <Card key={step.num} className="bg-white/[0.03] border-white/[0.06] rounded-2xl">
              <CardContent className="p-6">
                <div className="text-3xl font-black text-pink-500/40 mb-4">{step.num}</div>
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PREÇOS */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <p className="text-center text-xs font-bold tracking-[0.2em] text-white/30 uppercase mb-4">Preços</p>
        <h2 className="text-center text-3xl font-black mb-14 tracking-tight">Simples e sem surpresas</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              price: 'R$39', period: 'pagamento único', title: 'Análise Completa',
              items: ['Diagnóstico profundo do perfil', 'Estratégia de posicionamento', 'Melhorias recomendadas'],
              highlight: 'Cronograma da semana incluso', cta: 'Começar análise', primary: true,
            },
            {
              price: 'R$19', period: 'pagamento único', title: 'Cronograma Semanal',
              items: ['7 dias de conteúdo', 'Posts, reels e stories', 'Legendas prontas', 'Hashtags por conteúdo'],
              cta: 'Gerar semana',
            },
            {
              price: 'R$29', period: 'pagamento único', title: 'Cronograma Mensal',
              items: ['30 dias de conteúdo', 'Posts, reels e stories', 'Legendas prontas', 'Hashtags por conteúdo'],
              cta: 'Gerar mês',
            },
          ].map(plan => (
            <Card key={plan.title} className={`rounded-2xl ${plan.primary ? 'border-pink-500/40 bg-pink-500/5' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-black text-white mb-1">{plan.price}</div>
                <div className="text-white/40 text-sm mb-6">{plan.period}</div>
                <div className="font-bold text-white mb-3">{plan.title}</div>
                <ul className="text-sm text-white/50 space-y-2 mb-8 text-left">
                  {plan.items.map(i => <li key={i}>✓ {i}</li>)}
                  {plan.highlight && <li className="text-pink-400 font-medium">✓ {plan.highlight}</li>}
                </ul>
                <Link href="/login">
                  <Button className={`w-full rounded-full ${plan.primary ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90' : 'border border-white/15 bg-transparent text-white hover:bg-white/5'}`}>
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-white/30 mt-6">
          Imagens geradas por IA → R$1 por imagem · Sem assinatura
        </p>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.05] py-8 text-center text-sm text-white/25">
        © 2025 InstaMax · Produto Lorvix · lorvix.com.br
      </footer>
    </div>
  )
}
