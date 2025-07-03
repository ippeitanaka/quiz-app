# データベーススキーマの更新ガイド

## 概要

クイズアプリの機能拡張に伴い、データベーススキーマの更新が必要です。このガイドでは、Supabaseダッシュボードを使用してスキーマを更新する方法を説明します。

## 手順

1. Supabaseダッシュボードにログインします。
2. プロジェクトを選択します。
3. 左側のメニューから「SQL Editor」を選択します。
4. 「New Query」ボタンをクリックします。
5. 以下のSQLを貼り付けます：

\`\`\`sql
-- 既存のテーブルに新しいカラムを追加
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "time_limit_per_question" integer DEFAULT 30;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "theme_color" text DEFAULT 'pastel-blue';
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "background_url" text;

-- メディア関連のテーブル作成
CREATE TABLE IF NOT EXISTS "media" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "question_id" uuid REFERENCES "questions"("id") ON DELETE CASCADE,
  "type" text NOT NULL CHECK (type IN ('image', 'audio', 'video')),
  "url" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- チーム機能のためのテーブル作成
CREATE TABLE IF NOT EXISTS "teams" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "quiz_id" uuid REFERENCES "quizzes"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

-- 参加者とチームを紐づけるためのカラム追加
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "team_id" uuid REFERENCES "teams"("id") ON DELETE SET NULL;

-- 詳細な分析のためのテーブル修正
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "time_taken" integer;
\`\`\`

6. 「Run」ボタンをクリックしてSQLを実行します。
7. 実行が完了したら、左側のメニューから「Table Editor」を選択し、テーブルが正しく更新されていることを確認します。

## 確認事項

以下の項目が正しく追加されていることを確認してください：

1. `quizzes` テーブルに以下のカラムが追加されていること：
   - `time_limit_per_question`
   - `theme_color`
   - `logo_url`
   - `background_url`

2. 以下の新しいテーブルが作成されていること：
   - `media`
   - `teams`

3. `participants` テーブルに `team_id` カラムが追加されていること。

4. `responses` テーブルに `time_taken` カラムが追加されていること。

## トラブルシューティング

SQLの実行中にエラーが発生した場合は、以下を確認してください：

- テーブルやカラムが既に存在している可能性があります。その場合は、エラーメッセージを確認し、必要に応じてSQLを修正してください。
- 参照整合性制約に問題がある場合は、外部キー制約を確認してください。
- 権限の問題がある場合は、Supabaseのプロジェクト設定を確認してください。
