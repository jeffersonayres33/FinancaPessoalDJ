-- Execute este comando no Editor SQL do seu painel Supabase para adicionar o suporte a despesas fixas

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT FALSE;

-- Opcional: Adicionar um comentário para documentação
COMMENT ON COLUMN transactions.is_fixed IS 'Indica se a despesa é fixa (recorrente mensalmente)';
