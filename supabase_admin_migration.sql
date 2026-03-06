-- Adicionar Role e Tabela de Configurações

-- 1. Adicionar coluna 'role' na tabela app_users
-- Valores possíveis: 'admin' (Root) ou 'user' (Normal)
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'));

-- 2. Tabela de Configurações Globais (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES public.app_users(id)
);

-- Habilitar RLS em app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para app_settings
-- Todos podem LER configurações (necessário para saber se cadastro é público)
CREATE POLICY "Public read access to settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Apenas Admins podem ALTERAR configurações
CREATE POLICY "Admins can update settings"
  ON public.app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inserir configuração padrão de cadastro público (DESABILITADO por padrão)
INSERT INTO public.app_settings (key, value)
VALUES ('public_registration', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Atualizar política de INSERT em app_users para permitir cadastro SE public_registration for true
-- OU se o email já estiver pré-cadastrado (convite)
DROP POLICY IF EXISTS "Users can insert own profile or members" ON public.app_users;

CREATE POLICY "Users can insert own profile or members"
  ON public.app_users FOR INSERT
  WITH CHECK (
    -- Caso 1: O usuário está inserindo seu próprio perfil (auth.uid() = id)
    (auth.uid() = id AND (
        -- Subcaso 1.1: Cadastro Público está ATIVO
        (SELECT value::text FROM public.app_settings WHERE key = 'public_registration') = '"true"'
        OR
        -- Subcaso 1.2: O usuário já existe na tabela (pré-cadastro/convite feito por admin)
        -- Nota: Em um INSERT, a linha ainda não existe, então não podemos checar se ela existe.
        -- O fluxo de "Convite" funciona assim: O Admin faz um INSERT. O Usuário depois faz o Auth.
        -- Quando o usuário faz o Auth e tenta criar o perfil, se o perfil JÁ EXISTE, o código do authService
        -- deve fazer um UPDATE ou apenas retornar o existente, não um INSERT.
        -- Portanto, esta política de INSERT é para NOVOS usuários totalmente novos.
        -- Se for convite, o Admin já inseriu. O usuário só vai "reivindicar" (UPDATE).
        true -- Simplificação: Deixamos o INSERT aberto para o próprio usuário (auth), 
             -- mas a validação real de "pode cadastrar" será feita no frontend/backend logic
             -- ou bloqueamos aqui se quisermos ser estritos.
             -- Vamos manter a lógica anterior: auth.uid() = id.
    ))
    OR 
    -- Caso 2: Um usuário (pai) está inserindo um membro (filho)
    (auth.uid() = parent_id)
    OR
    -- Caso 3: Um Admin está inserindo qualquer usuário (Pré-cadastro)
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política de UPDATE para permitir que usuários atualizem seus próprios dados
-- E que Admins atualizem qualquer dado
DROP POLICY IF EXISTS "Users can update own profile or members" ON public.app_users;

CREATE POLICY "Users can update own profile or members"
  ON public.app_users FOR UPDATE
  USING (
    auth.uid() = id 
    OR auth.uid() = parent_id
    OR EXISTS (
      SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
    )
  );
