# AgendaFácil — guia do projeto

SaaS de agendamento online (PT-BR). Empresas criam conta, montam equipe e serviços; cada profissional tem um link público onde clientes agendam. Multi-tenant por organização.

> [!important] Leia isto antes de explorar o código
> Este arquivo existe para evitar reexploração. A arquitetura, o schema e as
> convenções estão aqui. Confie neste mapa e vá direto ao arquivo relevante.

## Stack
- React 18 + TypeScript (strict, `noUnusedLocals`/`noUnusedParameters`) + Vite (**rolldown-vite** 7.1.14)
- Tailwind v3 + **shadcn/ui** (new-york/slate) em `src/components/ui/` — 18 primitivos
- `lucide-react` (ícones), `framer-motion` (reveals sutis), `sonner` (toasts), `date-fns`
- `react-router-dom` v7, `react-query` v3, `@fullcalendar/*` (AgendaCalendar)
- Backend: **Supabase** (projeto `yyekxiajifeyfuabdasv`) — Postgres + RLS + RPCs + 1 Edge Function
- Alias `@` → `./src`

## Comandos
- `npm run dev` — Vite (porta 5173)
- `npm run build` — `tsc -b && vite build` (**rode antes de cada commit**; o TS é strict)
- `npm run lint` — eslint
- `npm test` — Playwright

## Fluxo de trabalho (worktree)
Trabalho no worktree `.claude/worktrees/<nome>` na branch `claude/<nome>`. Ao terminar uma etapa:
1. `git add -A && git commit` no worktree → `git push`
2. No repo principal `C:\Users\gabri\agendamentofacil`: `git checkout main && git merge claude/<nome> && git push origin main`
- Repo: `GabrielPuccinelli/agendamentofacil`. Commits terminam com `Co-Authored-By: Claude ...`.
- O `node_modules` do repo principal pode estar desatualizado — rodar `npm install` lá após pull se deps mudaram.

## Rotas → páginas (`src/App.tsx`, todas via React.lazy)
| Rota | Página | Notas |
|---|---|---|
| `/` | HomePage | landing |
| `/login` | AuthPage | abas Entrar/Criar conta; escolha Empresa/Funcionário grava `sessionStorage.signup_role`. Google está **escondido** (`providers={[]}`) até configurar no dashboard. `?redirect=` sanitizado |
| `/onboarding` | OnboardingPage | cria organization+member (admin) ou member órfão (staff) |
| `/dashboard` | DashboardPage | visão do dia + calendário + bloqueios |
| `/company/dashboard\|clients\|team\|services` | CompanyDashboardPage | abas via pathname |
| `/company/profile` | CompanyProfilePage | logo/capa/contato (perfil público) |
| `/company/invite` | InviteCreatePage | |
| `/profile/edit` | EditProfilePage | |
| `/invite/:token` | InviteAcceptPage | |
| `/agendamento/:token` | ManageBookingPage | **cliente** cancela/remarca via manage_token |
| `/:organizationSlug` | OrganizationPage | página pública da empresa (URL limpa) |
| `/:organizationSlug/:memberSlug` | PublicPage | agendamento público do profissional |
| `/e/...` | (legado) | URLs antigas com `/e/` ainda funcionam |
| `*` | NotFoundPage | catch-all 404 |

## Componentes-chave (`src/components/`)
- `AppShell` — layout autenticado (sidebar desktop + Sheet mobile). Toda página logada usa.
- `Sidebar` — `SidebarContent` exportado; `PublicLinkCard` (copiar link). Props incluem `memberSlug`.
- `DayOverview` — métricas + agenda do dia + próximos 7 dias (dashboard do profissional)
- `ManageTimeBlocks` — bloqueios (tabela `time_blocks`)
- `ManageServices` / `ManageMembers` / `ManageAvailability` — CRUD
- Compartilhados: `PageHeader`, `StatCard`, `EmptyState`, `ConfirmButton` (AlertDialog), `Reveal`

## Banco de dados (Supabase)
Tabelas: `organizations` (slug, logo_url, cover_url, description, whatsapp, address, opening_hours, instagram, **`require_confirmation`** bool), `members` (role admin/staff, `can_edit_profile/price/services`, `organization_id` nullable), `services` (nível org), `member_services` (junção), `availability`, `bookings` (status confirmed/cancelled/pending/completed, `client_email`, **`manage_token`** uuid, **`reminder_sent_at`**), `time_blocks`, `member_invites`.

- **Constraint `bookings_no_overlap`** (EXCLUDE/btree_gist): impede sobreposição de horário do mesmo member (status≠cancelled). INSERT conflitante → erro `23P01`; PublicPage trata com mensagem amigável.
- **`bookings` NÃO tem leitura pública** (removida — vazava dados do cliente). Slots públicos usam o RPC `get_busy_times(member_id, from, to)` que só retorna faixas ocupadas (bookings + time_blocks, sem PII). Staff lê os seus; admin lê todos; staff faz UPDATE dos seus (confirmar/recusar).

RPCs (SECURITY DEFINER, `search_path` fixado): `create_organization_and_admin`, `find_member_by_email`, `accept_invite`, `add_member_to_organization` (reaproveita linha órfã do onboarding), `get_booking_by_token` / `cancel_booking_by_token` / `reschedule_booking_by_token` / `get_busy_times` (públicas — token é o segredo / busy sem PII).

Edge Functions (precisam de `RESEND_API_KEY`; sem ela agenda funciona mas não envia e-mail):
- `notify-booking` — trigger no INSERT de bookings; avisa profissional+dono e confirma ao cliente (se deu e-mail).
- `send-reminders` — chamada por **pg_cron** de hora em hora; lembra clientes ~24h antes (usa `reminder_sent_at`). Opcional: `NOTIFY_APP_URL` (links de prod), `NOTIFY_FROM_EMAIL`, `CRON_SECRET`.

Storage: bucket público `public-assets` (logos/capas) e `avatars`. **Upload usa upsert → exige policy de SELECT** (existe `Auth read public-assets` para authenticated). Listagem pública fica bloqueada de propósito.

## Convenções e armadilhas
- Anon key é **pública por design** (protegida por RLS), já commitada em `supabaseClient.ts` — ok.
- Consultas a `members` por `user_id` usam `.order('organization_id', {nullsFirst:false}).limit(1).maybeSingle()` — um usuário pode ter linha órfã (onboarding) + linha da equipe; `.single()` quebra e causa loop de "Carregando dashboard".
- Joins do Supabase tipam como array → cast `as unknown as T[]`.
- `react-query` v3: `onError` em bloco `{ toast.error(...); }` (não arrow, retorna id).
- Utilitários legados preservados no CSS: `.gradient-brand`, `.gradient-text`, `.glass`, `.card-lift`. Cor primária índigo (`239 84% 67%`).
- Keep-alive do Supabase: GitHub Action `.github/workflows/supabase-keep-alive.yml` (cron diário) — free tier pausa sem requisições externas.
- Spec do redesign: `docs/superpowers/specs/2026-06-10-redesign-agendafacil-design.md`.

## Pendências do usuário (fora do código)
- Configurar provider Google no dashboard Supabase para reativar o botão de login.
- Criar conta Resend + secret `RESEND_API_KEY` para e-mails de agendamento.
- Ativar "Leaked Password Protection" em Auth → Settings.
