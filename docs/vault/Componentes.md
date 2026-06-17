---
title: Componentes
tags:
  - frontend
  - componentes
---

# Componentes

Parte de [[AgendaFácil]]. Em `src/components/` (primitivos shadcn em `src/components/ui/`).

## Layout
- **AppShell** — casca autenticada: sidebar fixa no desktop, `Sheet` (drawer) no mobile. Toda [[Páginas|página logada]] usa.
- **Sidebar** — exporta `SidebarContent`; `PublicLinkCard` copia o link público. Prop `memberSlug` habilita "Meu link".

## Domínio
- **DayOverview** — métricas (hoje, semana, próximo cliente, ocupação) + agenda do dia em timeline (WhatsApp) + próximos 7 dias
- **ManageTimeBlocks** — CRUD de [[Banco de Dados|time_blocks]]
- **ManageServices** / **ManageMembers** / **ManageAvailability** — CRUDs
- **AgendaCalendar** — FullCalendar (chunk pesado, só no dashboard)

## Compartilhados
- **PageHeader** — título + descrição + ações (padrão de cabeçalho)
- **StatCard** — cartão de métrica (ícone em chip)
- **EmptyState** — estado vazio amigável
- **ConfirmButton** — wrapper de `AlertDialog` para confirmações destrutivas
- **Reveal** — animação `whileInView` respeitando `prefers-reduced-motion`

> [!note] Estilo
> Cor primária índigo. Utilitários legados preservados: `.gradient-brand`, `.gradient-text`, `.glass`, `.card-lift`.
