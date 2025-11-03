-- src/lib/policies.sql

-- POLÍTICA DE ACESSO PÚBLICO PARA ORGANIZAÇÕES
-- Esta política permite que qualquer pessoa (mesmo sem estar logada)
-- possa visualizar os dados da tabela 'organizations'.
-- É essencial para que as páginas públicas de profissionais e empresas funcionem.

-- COMO APLICAR:
-- 1. Vá para o seu painel do Supabase.
-- 2. Navegue até o "SQL Editor".
-- 3. Cole o conteúdo deste arquivo e clique em "RUN".

CREATE POLICY "Allow public read access to organizations"
ON public.organizations
FOR SELECT
USING (true);
