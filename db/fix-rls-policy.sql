-- quizzesテーブルに対して認証済みユーザーがINSERTできるようにするポリシーを追加
CREATE POLICY "Authenticated users can create quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- quizzesテーブルに対して自分が作成したクイズを更新できるようにするポリシーを追加
CREATE POLICY "Users can update their own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = admin_id);

-- quizzesテーブルに対して自分が作成したクイズを削除できるようにするポリシーを追加
CREATE POLICY "Users can delete their own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = admin_id);
