-- タイマー機能のためのカラム追加
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "time_limit_per_question" integer DEFAULT 30;

-- メディア関連のテーブル作成
CREATE TABLE IF NOT EXISTS "media" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "question_id" uuid REFERENCES "questions"("id") ON DELETE CASCADE,
  "type" text NOT NULL CHECK (type IN ('image', 'audio', 'video')),
  "url" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- テーマカスタマイズのためのカラム追加
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "theme_color" text DEFAULT 'pastel-blue';
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "background_url" text;

-- チーム機能のためのテーブル作成
CREATE TABLE IF NOT EXISTS "teams" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "quiz_session_id" uuid REFERENCES "quiz_sessions"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

-- 参加者とチームを紐づけるためのカラム追加
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "team_id" uuid REFERENCES "teams"("id") ON DELETE SET NULL;

-- 詳細な分析のためのテーブル修正
ALTER TABLE "answers" ADD COLUMN IF NOT EXISTS "time_taken" integer;
