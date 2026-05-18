-- Migration to add budget_history to categories table

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS budget_history jsonb;
