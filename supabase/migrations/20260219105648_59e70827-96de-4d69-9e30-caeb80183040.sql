-- Add editable metadata columns to sessions table
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS event_type text;

-- Backfill display_name from name for existing sessions
UPDATE public.sessions SET display_name = name WHERE display_name IS NULL;