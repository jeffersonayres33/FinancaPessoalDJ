-- SQL para atualizar a tabela de análises de IA
-- Execute este script no seu painel SQL do Supabase

-- 1. Criar a tabela se não existir
create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  data_context_id uuid not null,
  user_id uuid not null,
  summary text not null,
  tips text[] not null,
  anomalies text[] not null,
  total_expenses numeric not null,
  total_income numeric not null,
  total_investments numeric not null default 0,
  transaction_count integer not null,
  created_at timestamp with time zone default now()
);

-- 2. Habilitar RLS
alter table public.ai_analyses enable row level security;

-- 3. Criar política de acesso (se não existir)
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'ai_analyses' 
        and policyname = 'Users can manage ai_analyses in their context'
    ) then
        create policy "Users can manage ai_analyses in their context"
          on public.ai_analyses for all
          using (
            data_context_id = auth.uid() 
            or exists (
              select 1 from public.app_users 
              where id = ai_analyses.data_context_id 
              and parent_id = auth.uid()
            )
          );
    end if;
end
$$;

-- 4. Adicionar colunas caso a tabela já exista mas esteja desatualizada
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name='ai_analyses' and column_name='user_id') then
        alter table public.ai_analyses add column user_id uuid;
    end if;
    
    if not exists (select 1 from information_schema.columns where table_name='ai_analyses' and column_name='total_investments') then
        alter table public.ai_analyses add column total_investments numeric not null default 0;
    end if;
end
$$;
