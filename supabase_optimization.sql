-- OTIMIZAÇÃO DE PERFORMANCE E SEGURANÇA
-- CORREÇÃO: Substituído 'user_id' por 'data_context_id' conforme esquema do banco

-- 1. ÍNDICES PARA PERFORMANCE
-- Adicionar índices para acelerar consultas frequentes de filtro e junção

-- Tabela transactions
CREATE INDEX IF NOT EXISTS idx_transactions_data_context_id ON public.transactions(data_context_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category);
-- Índice composto para filtros comuns (contexto + data)
CREATE INDEX IF NOT EXISTS idx_transactions_context_date ON public.transactions(data_context_id, date);

-- Tabela categories
CREATE INDEX IF NOT EXISTS idx_categories_data_context_id ON public.categories(data_context_id);

-- Tabela app_users
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_parent_id ON public.app_users(parent_id);

-- 2. SEGURANÇA (RLS) PARA APP_SETTINGS
-- Garantir que apenas admins possam modificar configurações globais

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Todos podem ler (necessário para saber se cadastro é público)
DROP POLICY IF EXISTS "Everyone can read settings" ON public.app_settings;
CREATE POLICY "Everyone can read settings" 
ON public.app_settings FOR SELECT 
USING (true);

-- Política de Modificação: Apenas Admins (usando a função segura is_admin criada anteriormente)
DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;
CREATE POLICY "Admins can update settings" 
ON public.app_settings FOR UPDATE 
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert settings" ON public.app_settings;
CREATE POLICY "Admins can insert settings" 
ON public.app_settings FOR INSERT 
WITH CHECK (public.is_admin());
