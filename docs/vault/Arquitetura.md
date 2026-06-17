---
title: Arquitetura
tags:
  - arquitetura
aliases:
  - Stack
---

# Arquitetura

Parte de [[AgendaFácil]].

## Stack
- **Front:** React 18 + TypeScript strict, Vite (`rolldown-vite` 7.1.14), alias `@` → `./src`
- **UI:** Tailwind v3 + [[Componentes|shadcn/ui]], `lucide-react`, `framer-motion`, `sonner`
- **Roteamento/dados:** `react-router-dom` v7, `react-query` v3, `@fullcalendar/*`
- **Back:** [[Banco de Dados|Supabase]] — Postgres + RLS + RPCs + Edge Function

## Comandos
```bash
npm run dev      # Vite porta 5173
npm run build    # tsc -b && vite build — rodar antes de cada commit
npm run lint
npm test         # Playwright
```

> [!warning] Build antes de commit
> O TypeScript é strict (`noUnusedLocals`/`noUnusedParameters`). `npm run build` pega erros que o dev server não pega.

## Fluxo de trabalho (git worktree)
1. Trabalhar no worktree `.claude/worktrees/<nome>`, branch `claude/<nome>`
2. `git commit` + `git push` no worktree
3. No repo principal: `git checkout main && git merge claude/<nome> && git push origin main`

## Rotas
Definidas em `src/App.tsx`, todas via `React.lazy` + `Suspense`. Lista completa em `CLAUDE.md`. Destaques:
- URLs públicas limpas: `/:organizationSlug` e `/:organizationSlug/:memberSlug`
- Legado `/e/...` ainda funciona
- `/agendamento/:token` → cancelar/remarcar pelo cliente
- `*` → 404

> [!note] Slugs reservados
> `login`, `dashboard`, `company`, etc. são bloqueados na criação da empresa para não colidir com as rotas internas.
