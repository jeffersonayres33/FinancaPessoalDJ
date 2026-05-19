-- Este script pode ser rodado no SQL Editor da Supabase para limpar despesas auto-geradas duplicadas de competências iguais em todas as contas.

WITH Duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        data_context_id, 
        lower(trim(title)), 
        category, 
        date_trunc('month', date)
      ORDER BY created_at ASC
    ) as row_num
  FROM transactions
  WHERE is_fixed = true 
    AND is_auto_generated = true
)
DELETE FROM transactions
WHERE id IN (
  SELECT id 
  FROM Duplicates 
  WHERE row_num > 1
);
