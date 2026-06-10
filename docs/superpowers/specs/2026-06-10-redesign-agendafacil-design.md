# Redesign AgendaFácil — Design aprovado (2026-06-10)

## Decisões do usuário
- Estilo visual: **Híbrido evoluído** — sidebar escura índigo + conteúdo claro refinado.
- Dashboard deve ter: agenda do dia, faturamento, próximos agendamentos, desempenho da equipe, taxa de ocupação, clientes recorrentes.
- Recursos novos: cancelar/remarcar pelo cliente, histórico de clientes (CRM leve), bloqueio de horários, perfil da empresa (logo/capa/descrição/contato/horários).
- Páginas públicas: empresa E profissional ricas, com a mesma força.
- Estratégia: **B — área por área, recurso junto** (nada é redesenhado duas vezes).

## Etapas
1. **Fundação visual** — Sidebar com grupos ("Gestão"/"Pessoal"), bloco da empresa com copiar link público, item ativo em pill. Componentes: StatCard, PageHeader, EmptyState, Skeleton.
2. **Dashboard do profissional** — saudação + 4 métricas (hoje, semana, próximo cliente, ocupação), agenda do dia em timeline (cliente, serviço, WhatsApp), próximos 7 dias, bloqueio de horários (tabela `time_blocks`; slots públicos excluem bloqueios).
3. **Painel da empresa** — abas Visão Geral / Clientes / Equipe / Serviços + página Perfil da Empresa. Visão geral: faturamento mês, agendamentos, ocupação, novos×recorrentes, gráfico por dia, ranking equipe. Clientes: agregado de bookings por telefone (visitas, última visita). Perfil: colunas novas em `organizations` (logo_url, cover_url, description, whatsapp, address, opening_hours, instagram) + bucket Storage para imagens.
4. **Páginas públicas** — empresa: hero capa+logo, descrição, contato/endereço/horários, serviços com preços, equipe rica. Profissional: header rico + fluxo de agendamento refinado. Cancelar/remarcar: `bookings.manage_token` + página `/agendamento/:token` + RPCs SECURITY DEFINER (`get_booking_by_token`, `cancel_booking_by_token`, `reschedule_booking_by_token`); e-mail inclui o link.
5. **Polimento** — responsivo, estados vazios, microinterações, build final.

## Banco de dados
- `time_blocks` (id, member_id, start_time, end_time, reason) + RLS (membro gerencia os seus; admin os da org; leitura pública para cálculo de slots).
- `organizations` += logo_url, cover_url, description, whatsapp, address, opening_hours, instagram.
- `bookings` += manage_token uuid default gen_random_uuid(); status passa a aceitar 'cancelled'.
- Storage bucket público `public-assets` (logos/capas/avatares).

## Critérios de sucesso
- Build verde a cada etapa; commit por etapa; merge na main ao final de cada etapa.
- Nenhuma página perde funcionalidade existente.
