-- Script para atualizar o banco de dados existente no Supabase
-- Adiciona os novos tipos 'investment' e status 'in' / 'out'

-- 1. Atualizar a restrição da tabela categories
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense', 'both', 'investment'));

-- 2. Atualizar a restrição da tabela transactions para o campo type
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'investment'));

-- 3. Atualizar a restrição da tabela transactions para o campo status
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('paid', 'pending', 'in', 'out'));
