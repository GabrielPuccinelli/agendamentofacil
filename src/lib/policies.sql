-- src/lib/policies.sql

-- POLÍTICAS DE ACESSO PÚBLICO PARA A APLICAÇÃO DE AGENDAMENTO
-- Este script é "re-executável": ele primeiro apaga as políticas antigas
-- (se existirem) antes de criar as novas.

-- COMO APLICAR:
-- 1. Vá para o seu painel do Supabase.
-- 2. Navegue até o "SQL Editor".
-- 3. Cole TODO o conteúdo deste arquivo e clique em "RUN".

-- 1. Tabela de Organizações
DROP POLICY IF EXISTS "Allow public read access to organizations" ON public.organizations;
CREATE POLICY "Allow public read access to organizations"
ON public.organizations
FOR SELECT
USING (true);

-- 2. Tabela de Profissionais (Members)
DROP POLICY IF EXISTS "Allow public read access to members" ON public.members;
CREATE POLICY "Allow public read access to members"
ON public.members
FOR SELECT
USING (true);

-- 3. Tabela de Serviços
DROP POLICY IF EXISTS "Allow public read access to services" ON public.services;
CREATE POLICY "Allow public read access to services"
ON public.services
FOR SELECT
USING (true);

-- 4. Tabela de Horários (Availability)
DROP POLICY IF EXISTS "Allow public read access to availability" ON public.availability;
CREATE POLICY "Allow public read access to availability"
ON public.availability
FOR SELECT
USING (true);
