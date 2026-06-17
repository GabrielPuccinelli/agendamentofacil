---
title: Páginas
tags:
  - frontend
  - paginas
---

# Páginas

Parte de [[AgendaFácil]]. Em `src/pages/`. Toda página logada envolve o conteúdo em [[Componentes|AppShell]].

## Públicas
- **HomePage** — landing
- **AuthPage** — abas Entrar/Criar conta; escolha Empresa/Funcionário → `sessionStorage.signup_role`. Google escondido (`providers={[]}`). `?redirect=` sanitizado contra open-redirect.
- **OnboardingPage** — cria organization+member (admin) ou member órfão (staff)
- **OrganizationPage** (`/:org`) — página pública da empresa: capa, logo, contato, equipe, serviços
- **PublicPage** (`/:org/:membro`) — agendamento; slots excluem [[Banco de Dados|time_blocks]], cancelados e passado
- **ManageBookingPage** (`/agendamento/:token`) — cliente cancela/remarca

## Autenticadas
- **DashboardPage** — [[Componentes|DayOverview]] + AgendaCalendar + [[Componentes|ManageTimeBlocks]]
- **CompanyDashboardPage** — abas Visão Geral / Clientes (CRM leve) / Equipe / Serviços (via pathname)
- **CompanyProfilePage** — edição do perfil público (upload logo/capa → [[Banco de Dados|Storage]])
- **EditProfilePage**, **InviteCreatePage**, **InviteAcceptPage**, **MemberDashboardPage**, **NotFoundPage**

> [!example] Padrão de guard
> Páginas logadas: `getSession()` → se ausente, `navigate('/login?redirect=' + pathname)`. Preserva deep link.
