-- CORREÇÃO DE RECURSÃO INFINITA EM RLS
-- O problema ocorre porque a política tenta ler a própria tabela 'app_users' para verificar se o usuário é admin,
-- enquanto a própria leitura da tabela dispara a política novamente.

-- Solução: Usar uma função SECURITY DEFINER ou verificar metadados do auth.users (se possível),
-- mas a forma mais robusta no Supabase sem mexer em auth.users é evitar o SELECT recursivo na mesma tabela dentro da policy.

-- Vamos criar uma função auxiliar segura para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Verifica se existe um registro na tabela app_users com o ID do usuário atual e role 'admin'
  -- Importante: Fazemos SELECT direto, mas precisamos garantir que isso não dispare a política de SELECT recursivamente.
  -- Porém, funções chamadas dentro de policies ainda respeitam RLS, a menos que a tabela tenha RLS desativado ou a função seja SECURITY DEFINER.
  -- SECURITY DEFINER roda com as permissões de quem CRIOU a função (postgres/admin), ignorando RLS.
  RETURN EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agora recriamos as políticas usando a função segura

-- 1. Política de SELECT (Visualização)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.app_users;
DROP POLICY IF EXISTS "Users can view own profile or members" ON public.app_users;

-- Política unificada de leitura para evitar conflitos
CREATE POLICY "Users can view profiles"
  ON public.app_users FOR SELECT
  USING (
    -- O usuário pode ver seu próprio perfil
    auth.uid() = id 
    OR 
    -- O usuário pode ver perfis que ele gerencia (filhos)
    auth.uid() = parent_id
    OR 
    -- Admins podem ver tudo (usando a função segura para evitar recursão)
    public.is_admin()
  );

-- 2. Política de UPDATE
DROP POLICY IF EXISTS "Users can update own profile or members" ON public.app_users;

CREATE POLICY "Users can update profiles"
  ON public.app_users FOR UPDATE
  USING (
    -- Quem pode atualizar?
    auth.uid() = id 
    OR auth.uid() = parent_id
    OR public.is_admin()
  );

-- 3. Política de INSERT (Mantida similar, mas usando is_admin se necessário)
DROP POLICY IF EXISTS "Users can insert own profile or members" ON public.app_users;

CREATE POLICY "Users can insert profiles"
  ON public.app_users FOR INSERT
  WITH CHECK (
    -- Próprio usuário (durante cadastro)
    auth.uid() = id
    OR 
    -- Pai criando filho
    auth.uid() = parent_id
    OR
    -- Admin criando qualquer um
    public.is_admin()
  );
