
-- Add MDB import support columns to imports table
ALTER TABLE public.imports 
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'csv',
  ADD COLUMN IF NOT EXISTS race_catalog jsonb DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.imports.source_type IS 'csv or mdb - determines import workflow';
COMMENT ON COLUMN public.imports.race_catalog IS 'JSON catalog of races found in MDB file, used for selective import';
