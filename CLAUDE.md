# Lorvix — Sistema de Agendamento para Clínicas

Sistema SaaS multi-tenant de agendamento para clínicas médicas, odontológicas e estéticas.
Cada clínica tem subdomínio próprio, dados isolados, visual personalizado e atendente IA no WhatsApp 24h via n8n + Evolution API.

---

## Stack

- **Framework:** Next.js 14 com App Router e TypeScript
- **Estilização:** Tailwind CSS + Shadcn UI
- **Banco de dados:** Supabase (Auth + PostgreSQL + Storage + RLS)
- **Pagamentos:** Stripe (webhooks para ativar/desativar clínicas automaticamente)
- **WhatsApp IA:** n8n + Evolution API + OpenAI
- **Deploy:** VPS Hostinger + PM2 + Nginx
- **Repositório:** GitHub

---

## Arquitetura Multi-Tenant

Cada clínica é um **tenant** identificado por `clinic_id`.

O isolamento funciona em 5 camadas:
1. Subdomínio identifica o tenant: `{slug}.lorvix.com.br`
2. Middleware Next.js valida se o tenant existe
3. JWT com `clinic_id` embutido e assinado
4. RLS no Supabase — banco rejeita qualquer query de outro tenant
5. Audit log de todas as alterações (LGPD)

**Rotas:**
```
lorvix.com.br              → landing page / cadastro
app.lorvix.com.br          → painel admin (gestor Lorvix)
{slug}.lorvix.com.br       → sistema exclusivo da clínica
```

**Exemplo:** `drcosta.lorvix.com.br`

---

## Banco de Dados — IMPORTANTE

O banco está no Supabase com todas as tabelas e RLS configurados do zero.

**O RLS usa `auth.uid()` do Supabase Auth.**

A função `get_clinic_id()` já existe no banco:
```sql
-- Retorna o clinic_id do usuário autenticado via Supabase Auth
SELECT clinic_id FROM clinic_users WHERE id = auth.uid();
```

**Toda autenticação deve passar pelo Supabase Auth.**
Nunca criar sistema de auth próprio — usar sempre `@supabase/ssr`.

### Tabelas:
- `clinics` — tenants (slug, cores, logo, plano, stripe_ids, is_active)
- `clinic_users` — usuários com role: owner | receptionist | doctor
- `professionals` — profissionais com especialidade
- `availability` — horários disponíveis por dia da semana
- `schedule_blocks` — bloqueios de agenda (férias, feriados, reuniões)
- `patients` — pacientes com CPF, convênio, histórico
- `appointments` — agendamentos com status e tipo
- `waitlist` — fila de espera
- `financial_records` — registros financeiros
- `notification_templates` — templates de mensagens por tipo e canal
- `whatsapp_config` — configuração do agente WhatsApp por clínica
- `whatsapp_conversations` — histórico de conversas WhatsApp
- `audit_log` — log de auditoria LGPD

---

## Agente WhatsApp (n8n + Evolution API)

O agente WhatsApp é externo ao Next.js — roda no n8n no mesmo VPS.

**Fluxo:**
```
Paciente manda mensagem
        ↓
Evolution API recebe e dispara webhook para o n8n
        ↓
n8n busca histórico da conversa na API do Lorvix
        ↓
n8n chama OpenAI com contexto da clínica + histórico
        ↓
Se for agendamento → n8n chama API interna do Lorvix
        ↓
Lorvix cria o agendamento no banco
        ↓
n8n envia resposta via Evolution API
```

**Endpoints que o n8n consome (criar no Next.js):**
- `GET /api/n8n/availability?clinic_id=&professional_id=&date=` — horários livres
- `GET /api/n8n/patients?clinic_id=&phone=` — buscar paciente por telefone
- `POST /api/n8n/patients` — criar paciente
- `POST /api/n8n/appointments` — criar agendamento
- `GET /api/n8n/clinic-info?clinic_id=` — dados da clínica para contexto da IA

Todas as rotas `/api/n8n/*` validam um `N8N_API_SECRET` no header.

---

## Comandos

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Typecheck
npm run typecheck

# Lint
npm run lint

# Produção (VPS)
pm2 start ecosystem.config.js
pm2 restart lorvix
pm2 logs lorvix
```

---

## Estrutura de Arquivos

```
lorvix/
├── app/
│   ├── (auth)/login/           → tela de login por tenant
│   ├── (clinic)/               → rotas protegidas da clínica
│   │   ├── agenda/
│   │   ├── pacientes/
│   │   ├── profissionais/
│   │   ├── financeiro/
│   │   ├── configuracoes/
│   │   └── layout.tsx          → sidebar + header com tema da clínica
│   ├── (admin)/admin/          → painel admin Lorvix
│   └── api/
│       ├── webhooks/stripe/    → ativa/desativa clínica por pagamento
│       └── n8n/                → endpoints consumidos pelo agente WhatsApp
├── middleware.ts                → resolve tenant pelo subdomínio
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts            → service role para webhooks
│   ├── auth.ts
│   └── tenant.ts
├── components/
│   ├── agenda/
│   ├── patients/
│   └── ui/
└── CLAUDE.md
```

---

## Convenções de Código

- ES modules (`import/export`), nunca `require`
- Componentes React em PascalCase, funções e variáveis em camelCase
- Server Components por padrão — `"use client"` só quando necessário
- Nunca usar `any` no TypeScript
- Queries ao banco sempre filtradas por `clinic_id` — nunca confiar só no RLS
- Variáveis sensíveis sempre em `.env.local` — nunca no código

---

## Segurança — Regras Críticas

- **Nunca** retornar dados sem filtrar por `clinic_id`
- **Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` no client
- **Sempre** validar `clinic_id` do JWT antes de qualquer operação
- **Sempre** registrar alterações em dados de pacientes no `audit_log`
- Rotas `/api/n8n/*` exigem header `x-api-secret: N8N_API_SECRET`
- Rate limiting nas rotas de login (máximo 5 tentativas)
- Headers de segurança no `next.config.js` (CSP, HSTS, X-Frame-Options)

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
N8N_API_SECRET=
BASE_DOMAIN=lorvix.com.br
ADMIN_EMAIL=
```

---

## Workflow de Desenvolvimento

1. Cada fase termina com commit no GitHub:
   ```bash
   git add .
   git commit -m "Fase X: descrição"
   git push origin main
   ```
2. Rodar `typecheck` e `lint` antes de cada commit
3. Testar isolamento multi-tenant com pelo menos 2 clínicas fictícias
4. Nunca modificar schema SQL direto — documentar alterações para rodar no Supabase

---

## Permissões por Role

| Feature | owner | receptionist | doctor |
|---------|-------|-------------|--------|
| Ver agenda | ✅ | ✅ | ✅ própria |
| Criar agendamento | ✅ | ✅ | ❌ |
| Ver financeiro | ✅ | ✅ | ❌ |
| Configurações | ✅ | ❌ | ❌ |
| Personalização visual | ✅ | ❌ | ❌ |

## Planos

| Plano | Preço | Profissionais | WhatsApp IA |
|-------|-------|--------------|-------------|
| Basic | R$197/mês | até 2 | Add-on R$150 |
| Pro | R$397/mês | até 5 | Incluso |
| Enterprise | R$797/mês | ilimitado | Incluso |
