-- Migration to add is_active and inactivation fields to categories table

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS inactivation_month integer;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS inactivation_year integer;
