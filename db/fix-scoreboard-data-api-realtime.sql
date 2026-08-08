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

-- Public display can read only public scoreboards.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scoreboards'
      AND policyname = 'Public scoreboards are viewable by everyone'
  ) THEN
    CREATE POLICY "Public scoreboards are viewable by everyone"
      ON public.scoreboards
      FOR SELECT
      USING (is_public = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scoreboard_entries'
      AND policyname = 'Public scoreboard entries are viewable by everyone'
  ) THEN
    CREATE POLICY "Public scoreboard entries are viewable by everyone"
      ON public.scoreboard_entries
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.scoreboards s
          WHERE s.id = scoreboard_id
            AND s.is_public = true
        )
      );
  END IF;
END $$;

-- Logged-in administrators can manage their own scoreboards.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scoreboards'
      AND policyname = 'Admins can create their own scoreboards'
  ) THEN
    CREATE POLICY "Admins can create their own scoreboards"
      ON public.scoreboards
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = admin_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scoreboards'
      AND policyname = 'Admins can view their own scoreboards'
  ) THEN
    CREATE POLICY "Admins can view their own scoreboards"
      ON public.scoreboards
      FOR SELECT
      TO authenticated
      USING (auth.uid() = admin_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scoreboards'
      AND policyname = 'Admins can update their own scoreboards'
  ) THEN
    CREATE POLICY "Admins can update their own scoreboards"
      ON public.scoreboards
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = admin_id)
      WITH CHECK (auth.uid() = admin_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scoreboards'
      AND policyname = 'Admins can delete their own scoreboards'
  ) THEN
    CREATE POLICY "Admins can delete their own scoreboards"
      ON public.scoreboards
      FOR DELETE
      TO authenticated
      USING (auth.uid() = admin_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scoreboard_entries'
      AND policyname = 'Admins can manage entries on their own scoreboards'
  ) THEN
    CREATE POLICY "Admins can manage entries on their own scoreboards"
      ON public.scoreboard_entries
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.scoreboards s
          WHERE s.id = scoreboard_id
            AND s.admin_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.scoreboards s
          WHERE s.id = scoreboard_id
            AND s.admin_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scoreboard_events'
      AND policyname = 'Admins can manage events on their own scoreboards'
  ) THEN
    CREATE POLICY "Admins can manage events on their own scoreboards"
      ON public.scoreboard_events
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.scoreboards s
          WHERE s.id = scoreboard_id
            AND s.admin_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.scoreboards s
          WHERE s.id = scoreboard_id
            AND s.admin_id = auth.uid()
        )
      );
  END IF;
END $$;
