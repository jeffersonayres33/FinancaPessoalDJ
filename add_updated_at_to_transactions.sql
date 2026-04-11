ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
