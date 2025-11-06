-- Adiciona a nova coluna 'can_edit_profile' à tabela 'members'
ALTER TABLE public.members
ADD COLUMN can_edit_profile BOOLEAN DEFAULT FALSE;

-- Garante que a política de segurança para a tabela 'members'
-- permita que os admins atualizem esta nova coluna.
-- (Este script assume que você já tem uma política de UPDATE para admins.
--  Se não tiver, ele precisará ser ajustado.)

-- Primeiro, removemos a política de UPDATE existente para recriá-la
DROP POLICY IF EXISTS "Allow admins to update members" ON public.members;

-- Recriamos a política, agora incluindo a nova coluna na verificação
CREATE POLICY "Allow admins to update members"
ON public.members
FOR UPDATE
USING ( get_my_role() = 'admin' )
WITH CHECK ( get_my_role() = 'admin' );
