-- Migration: Add note and is_adjustment columns to invoices table
-- Run this on Supabase Dashboard > SQL Editor or via Supabase CLI

-- Add note column (text field for adjustment/replacement invoice notes)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS note text;

-- Add is_adjustment column (boolean flag for adjustment invoices)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_adjustment boolean DEFAULT false;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('note', 'is_adjustment');
