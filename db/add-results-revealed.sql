-- active_questionsテーブルにresults_revealedフィールドを追加
ALTER TABLE active_questions ADD COLUMN IF NOT EXISTS results_revealed BOOLEAN DEFAULT FALSE;
