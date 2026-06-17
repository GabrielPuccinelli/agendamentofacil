---
title: AgendaFácil
tags:
  - projeto
  - moc
aliases:
  - Home
  - Índice
---

# AgendaFácil

Mapa de conteúdo (MOC) do projeto. SaaS de agendamento online multi-tenant.

> [!info] Para o agente
> Documentação navegável. O resumo operacional canônico está em `CLAUDE.md` na raiz.
> Este vault é a versão "Obsidian" — explore pelos links.

## Mapa
- [[Arquitetura]] — stack, rotas, fluxo de trabalho
- [[Banco de Dados]] — tabelas, RPCs, edge function, storage
- [[Páginas]] — uma nota por área de tela
- [[Componentes]] — blocos reutilizáveis
- [[Pendências]] — itens fora do código

## Resumo
Empresas criam conta e montam equipe + serviços. Cada profissional ganha um link público (`/empresa/profissional`) onde clientes agendam. Clientes recebem um link secreto para cancelar/remarcar. Painel da empresa traz métricas, clientes (CRM leve) e perfil público.

> [!tip] Stack em uma linha
> React 18 + TS strict + Vite (rolldown) + Tailwind + shadcn/ui + Supabase (RLS + RPCs).
