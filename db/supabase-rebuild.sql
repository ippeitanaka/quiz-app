-- Supabase rebuild SQL for quiz-app
-- This script is idempotent and safe to re-run.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- Tables
-- =========================

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  time_limit_per_question INTEGER DEFAULT 30,
  theme_color TEXT DEFAULT 'pastel-blue',
  logo_url TEXT,
  background_url TEXT
);

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'text', 'quick_response')),
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  "order" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  points_awarded INTEGER,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_taken INTEGER
);

CREATE TABLE IF NOT EXISTS public.active_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  results_revealed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'audio', 'video')),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- Indexes / Constraints
-- =========================

CREATE UNIQUE INDEX IF NOT EXISTS quizzes_code_idx ON public.quizzes (code);
CREATE UNIQUE INDEX IF NOT EXISTS participants_quiz_name_idx ON public.participants (quiz_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS responses_question_participant_idx ON public.responses (question_id, participant_id);
CREATE UNIQUE INDEX IF NOT EXISTS active_questions_quiz_idx ON public.active_questions (quiz_id);

CREATE INDEX IF NOT EXISTS questions_quiz_order_idx ON public.questions (quiz_id, "order");
CREATE INDEX IF NOT EXISTS participants_quiz_id_idx ON public.participants (quiz_id);
CREATE INDEX IF NOT EXISTS responses_question_id_idx ON public.responses (question_id);
CREATE INDEX IF NOT EXISTS responses_participant_id_idx ON public.responses (participant_id);
CREATE INDEX IF NOT EXISTS teams_quiz_id_idx ON public.teams (quiz_id);
CREATE INDEX IF NOT EXISTS media_question_id_idx ON public.media (question_id);

-- =========================
-- Functions
-- =========================

CREATE OR REPLACE FUNCTION public.get_active_question_for_participant(
  quiz_id_param UUID,
  participant_id_param UUID
)
RETURNS TABLE (
  id UUID,
  quiz_id UUID,
  content TEXT,
  type TEXT,
  options JSONB,
  points INTEGER,
  "order" INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.quiz_id,
    q.content,
    q.type,
    q.options,
    q.points,
    q."order"
  FROM public.active_questions aq
  JOIN public.questions q ON aq.question_id = q.id
  LEFT JOIN public.responses r
    ON q.id = r.question_id
   AND r.participant_id = participant_id_param
  WHERE aq.quiz_id = quiz_id_param
    AND r.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- RLS
-- =========================

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow re-run.
DROP POLICY IF EXISTS "Public quizzes are viewable by everyone" ON public.quizzes;
DROP POLICY IF EXISTS "Public questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Participants can be viewed by everyone" ON public.participants;
DROP POLICY IF EXISTS "Participants can insert themselves" ON public.participants;
DROP POLICY IF EXISTS "Responses can be viewed by everyone" ON public.responses;
DROP POLICY IF EXISTS "Responses can be inserted by participants" ON public.responses;
DROP POLICY IF EXISTS "Active questions are viewable by everyone" ON public.active_questions;
DROP POLICY IF EXISTS "Media can be viewed by everyone" ON public.media;
DROP POLICY IF EXISTS "Teams can be viewed by everyone" ON public.teams;

DROP POLICY IF EXISTS "Authenticated users can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can update their own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can delete their own quizzes" ON public.quizzes;

DROP POLICY IF EXISTS "Authenticated users can create questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update their own questions" ON public.questions;
DROP POLICY IF EXISTS "Users can delete their own questions" ON public.questions;

DROP POLICY IF EXISTS "Authenticated users can create active_questions" ON public.active_questions;
DROP POLICY IF EXISTS "Users can update their own active_questions" ON public.active_questions;
DROP POLICY IF EXISTS "Users can delete their own active_questions" ON public.active_questions;

DROP POLICY IF EXISTS "Users can manage participants for their own quizzes" ON public.participants;
DROP POLICY IF EXISTS "Users can manage responses for their own quizzes" ON public.responses;
DROP POLICY IF EXISTS "Users can manage teams for their own quizzes" ON public.teams;
DROP POLICY IF EXISTS "Users can manage media for their own quizzes" ON public.media;

-- Public policies
CREATE POLICY "Public quizzes are viewable by everyone"
  ON public.quizzes FOR SELECT USING (true);

CREATE POLICY "Public questions are viewable by everyone"
  ON public.questions FOR SELECT USING (true);

CREATE POLICY "Participants can be viewed by everyone"
  ON public.participants FOR SELECT USING (true);

CREATE POLICY "Participants can insert themselves"
  ON public.participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Responses can be viewed by everyone"
  ON public.responses FOR SELECT USING (true);

CREATE POLICY "Responses can be inserted by participants"
  ON public.responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Active questions are viewable by everyone"
  ON public.active_questions FOR SELECT USING (true);

CREATE POLICY "Media can be viewed by everyone"
  ON public.media FOR SELECT USING (true);

CREATE POLICY "Teams can be viewed by everyone"
  ON public.teams FOR SELECT USING (true);

-- Authenticated user policies
CREATE POLICY "Authenticated users can create quizzes"
  ON public.quizzes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own quizzes"
  ON public.quizzes FOR UPDATE USING (auth.uid() = admin_id);

CREATE POLICY "Users can delete their own quizzes"
  ON public.quizzes FOR DELETE USING (auth.uid() = admin_id);

CREATE POLICY "Authenticated users can create questions"
  ON public.questions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own questions"
  ON public.questions FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = questions.quiz_id
        AND q.admin_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own questions"
  ON public.questions FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = questions.quiz_id
        AND q.admin_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create active_questions"
  ON public.active_questions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own active_questions"
  ON public.active_questions FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = active_questions.quiz_id
        AND q.admin_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own active_questions"
  ON public.active_questions FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = active_questions.quiz_id
        AND q.admin_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage participants for their own quizzes"
  ON public.participants FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = participants.quiz_id
        AND q.admin_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = participants.quiz_id
        AND q.admin_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can manage responses for their own quizzes"
  ON public.responses FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.questions qu
      JOIN public.quizzes q ON q.id = qu.quiz_id
      WHERE qu.id = responses.question_id
        AND q.admin_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.questions qu
      JOIN public.quizzes q ON q.id = qu.quiz_id
      WHERE qu.id = responses.question_id
        AND q.admin_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can manage teams for their own quizzes"
  ON public.teams FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = teams.quiz_id
        AND q.admin_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = teams.quiz_id
        AND q.admin_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can manage media for their own quizzes"
  ON public.media FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.questions qu
      JOIN public.quizzes q ON q.id = qu.quiz_id
      WHERE qu.id = media.question_id
        AND q.admin_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.questions qu
      JOIN public.quizzes q ON q.id = qu.quiz_id
      WHERE qu.id = media.question_id
        AND q.admin_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

COMMIT;