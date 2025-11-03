-- src/lib/policies.sql

-- POLÍTICAS DE ACESSO PÚBLICO PARA A APLICAÇÃO DE AGENDAMENTO
-- Estas políticas permitem que qualquer pessoa (mesmo sem estar logada)
-- possa visualizar os dados essenciais para as páginas públicas de agendamento.

-- COMO APLICAR:
-- 1. Vá para o seu painel do Supabase.
-- 2. Navegue até o "SQL Editor".
-- 3. Cole TODO o conteúdo deste arquivo e clique em "RUN".
--    (É seguro rodar várias vezes, as políticas serão substituídas).

-- Permite a leitura pública da tabela de empresas
CREATE POLICY "Allow public read access to organizations"
ON public.organizations
FOR SELECT
USING (true);

-- Permite a leitura pública da tabela de profissionais (members)
CREATE POLICY "Allow public read access to members"
ON public.members
FOR SELECT
USING (true);

-- Permite a leitura pública da tabela de serviços
CREATE POLICY "Allow public read access to services"
ON public.services
FOR SELECT
USING (true);

-- Permite a leitura pública da tabela de horários (availability)
CREATE POLICY "Allow public read access to availability"
ON public.availability
FOR SELECT
USING (true);
