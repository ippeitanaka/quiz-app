-- 質問コーナー機能のためのテーブル追加
CREATE TABLE IF NOT EXISTS question_corner_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS question_corner_posts_quiz_idx ON question_corner_posts (quiz_id);
CREATE INDEX IF NOT EXISTS question_corner_posts_created_at_idx ON question_corner_posts (created_at DESC);

ALTER TABLE question_corner_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Question corner posts are viewable by everyone" ON question_corner_posts
  FOR SELECT USING (true);

CREATE POLICY "Question corner posts can be inserted by everyone" ON question_corner_posts
  FOR INSERT WITH CHECK (true);
