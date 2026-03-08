-- Garante que a extensão uuid-ossp existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ajustes na tabela transactions para garantir robustez
ALTER TABLE transactions 
ALTER COLUMN is_fixed SET DEFAULT FALSE,
ALTER COLUMN is_fixed TYPE BOOLEAN USING CASE WHEN is_fixed THEN TRUE ELSE FALSE END;

-- Garante que installments seja JSONB e aceite NULL
ALTER TABLE transactions 
ALTER COLUMN installments DROP NOT NULL,
ALTER COLUMN installments TYPE JSONB USING installments::JSONB;

-- Garante índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_is_fixed ON transactions(is_fixed);

-- Remove constraints antigas que possam estar atrapalhando (opcional, com cuidado)
-- ALTER TABLE transactions DROP CONSTRAINT IF EXISTS some_constraint_name;

-- Garante que payment_date aceite NULL
ALTER TABLE transactions ALTER COLUMN payment_date DROP NOT NULL;
