-- Script Corrigido e Seguro para Tabela 'member_services'

-- 1. Criação de uma função para buscar o 'role' do usuário logado na tabela 'members'
-- O 'CREATE OR REPLACE' garante que não haverá erro se a função já existir.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.members
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Criação da tabela de vínculo, apenas se ela não existir
CREATE TABLE IF NOT EXISTS public.member_services (
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, service_id)
);


-- 3. Ativação do RLS (não dá erro se já estiver ativo)
ALTER TABLE public.member_services ENABLE ROW LEVEL SECURITY;


-- 4. Recriação das Políticas de Segurança

-- Primeiro, apaga as políticas antigas para evitar o erro de "já existe"
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.member_services;
DROP POLICY IF EXISTS "Allow admins to insert and delete" ON public.member_services;

-- Política de LEITURA: Qualquer usuário logado pode ver os vínculos.
CREATE POLICY "Allow read access to authenticated users"
ON public.member_services
FOR SELECT
USING (auth.role() = 'authenticated');

-- Política de ESCRITA: Apenas usuários com a função 'admin' podem criar, editar ou apagar vínculos.
CREATE POLICY "Allow admins to insert and delete"
ON public.member_services
FOR ALL
USING ( get_my_role() = 'admin' );
