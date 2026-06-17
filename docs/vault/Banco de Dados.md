---
title: Banco de Dados
tags:
  - supabase
  - backend
aliases:
  - Supabase
  - Schema
---

# Banco de Dados

Parte de [[AgendaFácil]]. Projeto Supabase `yyekxiajifeyfuabdasv`.

## Tabelas
- **organizations** — `slug`, `logo_url`, `cover_url`, `description`, `whatsapp`, `address`, `opening_hours`, `instagram`
- **members** — `role` (admin/staff), `can_edit_profile/price/services`, `organization_id` (nullable: staff órfão antes de entrar numa equipe)
- **services** — nível organização · **member_services** — junção profissional↔serviço
- **availability** — janelas de expediente por dia da semana
- **bookings** — `status` (confirmed/cancelled/pending/completed), `client_*`, **`manage_token`** uuid
- **time_blocks** — bloqueios (almoço/folga/feriado), excluídos dos slots públicos
- **member_invites** — convites por token

## RPCs (SECURITY DEFINER, search_path fixado)
- `create_organization_and_admin`, `find_member_by_email`, `accept_invite`
- `add_member_to_organization` — reaproveita a linha órfã do onboarding (evita duplicata)
- `get_booking_by_token` / `cancel_booking_by_token` / `reschedule_booking_by_token` — **públicas**, o token é o segredo

> [!bug] Linha duplicada de member
> Um usuário pode ter 2 linhas em `members` (órfã do onboarding + da equipe). Sempre consultar com `.order('organization_id',{nullsFirst:false}).limit(1).maybeSingle()`. `.single()` quebra → loop de "Carregando dashboard". Ver [[Páginas]].

## Edge Function
`notify-booking` — trigger no INSERT de `bookings` envia e-mail (Resend) ao profissional e ao dono. Precisa do secret `RESEND_API_KEY` (ver [[Pendências]]).

## Storage
Buckets públicos `public-assets` (logos/capas) e `avatars`.

> [!warning] Upload com upsert exige SELECT
> O upload usa `upsert`, que lê o objeto antes de gravar → precisa da policy `Auth read public-assets` (authenticated). A listagem pública fica bloqueada de propósito.

> [!tip] Anon key é pública por design
> Protegida por RLS, já commitada em `src/lib/supabaseClient.ts`. Não é vazamento.
