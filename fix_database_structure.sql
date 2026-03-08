-- Garante a integridade da coluna is_fixed
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT FALSE;

-- Garante que installments aceita NULL (importante para despesas fixas ou variáveis sem parcelas)
ALTER TABLE transactions 
ALTER COLUMN installments DROP NOT NULL;

-- Atualiza registros antigos que possam estar com is_fixed NULL para FALSE
UPDATE transactions 
SET is_fixed = FALSE 
WHERE is_fixed IS NULL;
