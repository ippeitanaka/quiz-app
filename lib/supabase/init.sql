-- Create database schema for the quiz app

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX quizzes_code_idx ON quizzes (code);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'text', 'quick_response')),
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  order INTEGER NOT NULL
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX participants_quiz_name_idx ON participants (quiz_id, name);

-- Responses table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  points_awarded INTEGER,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX responses_question_participant_idx ON responses (question_id, participant_id);

-- Active questions table (to track which question is currently active for a quiz)
CREATE TABLE active_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX active_questions_quiz_idx ON active_questions (quiz_id);

-- Function to get the active question for a participant, excluding already answered questions
CREATE OR REPLACE FUNCTION get_active_question_for_participant(quiz_id_param UUID, participant_id_param UUID)
RETURNS TABLE (
  id UUID,
  quiz_id UUID,
  content TEXT,
  type TEXT,
  options JSONB,
  points INTEGER,
  order INTEGER
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
    q.order
  FROM active_questions aq
  JOIN questions q ON aq.question_id = q.id
  LEFT JOIN responses r ON q.id = r.question_id AND r.participant_id = participant_id_param
  WHERE aq.quiz_id = quiz_id_param
  AND r.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for security
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_questions ENABLE ROW LEVEL SECURITY;

-- Public access policies (for anonymous users)
CREATE POLICY "Public quizzes are viewable by everyone" ON quizzes
  FOR SELECT USING (true);

CREATE POLICY "Public questions are viewable by everyone" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Participants can be viewed by everyone" ON participants
  FOR SELECT USING (true);

CREATE POLICY "Participants can insert themselves" ON participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Responses can be inserted by participants" ON responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Active questions are viewable by everyone" ON active_questions
  FOR SELECT USING (true);
