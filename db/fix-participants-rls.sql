-- 既存のRLSポリシーを確認
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'participants';

-- 既存のポリシーを削除（必要に応じて）
DROP POLICY IF EXISTS "参加者は自分自身のデータを読み取り可能" ON "participants";
DROP POLICY IF EXISTS "管理者は参加者を削除可能" ON "participants";
DROP POLICY IF EXISTS "管理者は参加者を管理可能" ON "participants";

-- 新しいポリシーを作成
CREATE POLICY "参加者は自分自身のデータを読み取り可能" ON "participants"
FOR SELECT
USING (true);

CREATE POLICY "管理者は参加者を管理可能" ON "participants"
FOR ALL
USING (true)
WITH CHECK (true);

-- responsesテーブルのポリシーも確認・修正
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'responses';

-- 既存のポリシーを削除（必要に応じて）
DROP POLICY IF EXISTS "参加者は自分の回答を読み取り可能" ON "responses";
DROP POLICY IF EXISTS "管理者は回答を管理可能" ON "responses";

-- 新しいポリシーを作成
CREATE POLICY "参加者は自分の回答を読み取り可能" ON "responses"
FOR SELECT
USING (true);

CREATE POLICY "管理者は回答を管理可能" ON "responses"
FOR ALL
USING (true)
WITH CHECK (true);
