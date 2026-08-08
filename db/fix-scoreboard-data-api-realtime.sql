-- Scoreboard: Supabase Data API + Realtime access fix
-- Safe to run repeatedly in Supabase SQL Editor.

-- Data API privileges (required for newer Supabase projects/defaults).
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Public display only needs SELECT. RLS policies still decide which rows are visible.
GRANT SELECT ON TABLE public.scoreboards TO anon;
GRANT SELECT ON TABLE public.scoreboard_entries TO anon;
GRANT SELECT ON TABLE public.scoreboard_events TO anon;

-- Logged-in administrators need CRUD access. RLS restricts rows to the owner.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.scoreboards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.scoreboard_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.scoreboard_events TO authenticated;

-- Keep service-role access available for future server-side maintenance.
GRANT ALL PRIVILEGES ON TABLE public.scoreboards TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.scoreboard_entries TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.scoreboard_events TO service_role;

-- Make UPDATE/DELETE payloads usable by Realtime.
ALTER TABLE public.scoreboards REPLICA IDENTITY FULL;
ALTER TABLE public.scoreboard_entries REPLICA IDENTITY FULL;
ALTER TABLE public.scoreboard_events REPLICA IDENTITY FULL;

-- Ensure the scoreboard tables are published to Supabase Realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'scoreboards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scoreboards;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'scoreboard_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scoreboard_entries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'scoreboard_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scoreboard_events;
  END IF;
END $$;

-- RLS should already be enabled by the original scoreboard migration.
ALTER TABLE public.scoreboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoreboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoreboard_events ENABLE ROW LEVEL SECURITY;
