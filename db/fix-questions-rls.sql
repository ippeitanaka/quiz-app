-- questionsテーブルに対するRLSポリシーを追加
CREATE POLICY "Authenticated users can create questions" ON questions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own questions" ON questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id AND q.admin_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own questions" ON questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id AND q.admin_id = auth.uid()
    )
  );

-- 必要に応じて他のテーブルのRLSポリシーも追加
CREATE POLICY "Authenticated users can create active_questions" ON active_questions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own active_questions" ON active_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id AND q.admin_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own active_questions" ON active_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id AND q.admin_id = auth.uid()
    )
  );
