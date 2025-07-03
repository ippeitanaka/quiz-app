"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@supabase/supabase-js"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Database, Play, RefreshCw } from "lucide-react"

export default function DatabaseSetupPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [customSql, setCustomSql] = useState("")
  const [supabaseUrl, setSupabaseUrl] = useState(process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  const [supabaseKey, setSupabaseKey] = useState(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "")

  // テーブル作成用のSQL
  const createTablesSql = `
-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
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

CREATE UNIQUE INDEX IF NOT EXISTS quizzes_code_idx ON quizzes (code);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
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
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS participants_quiz_name_idx ON participants (quiz_id, name);

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  points_awarded INTEGER,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_taken INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS responses_question_participant_idx ON responses (question_id, participant_id);

-- Active questions table
CREATE TABLE IF NOT EXISTS active_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS active_questions_quiz_idx ON active_questions (quiz_id);

-- メディア関連のテーブル
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'audio', 'video')),
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- チーム機能のテーブル
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
  `

  // 関数とRLSポリシー作成用のSQL
  const createFunctionsAndPoliciesSql = `
-- Function to get the active question for a participant
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
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Media can be viewed by everyone" ON media
  FOR SELECT USING (true);

CREATE POLICY "Teams can be viewed by everyone" ON teams
  FOR SELECT USING (true);

-- Authenticated user policies
CREATE POLICY "Authenticated users can create quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = admin_id);

CREATE POLICY "Users can delete their own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = admin_id);

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
  `

  // テストデータ作成用のSQL
  const createTestDataSql = `
-- テストクイズの作成
INSERT INTO quizzes (id, admin_id, title, description, code, is_active, created_at, time_limit_per_question, theme_color)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'test-admin', 'テストクイズ1', 'テスト用クイズです', '1234', true, NOW(), 30, 'pastel-blue'),
  ('22222222-2222-2222-2222-222222222222', 'test-admin', 'テストクイズ2', '別のテスト用クイズです', '5678', false, NOW(), 45, 'pastel-green');

-- テスト問題の作成
INSERT INTO questions (id, quiz_id, content, type, options, correct_answer, points, order)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '日本の首都は？', 'multiple_choice', '["東京", "大阪", "名古屋", "福岡"]', '東京', 10, 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '1 + 1 = ?', 'multiple_choice', '["1", "2", "3", "4"]', '2', 5, 2),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '自由回答の質問です', 'text', null, null, 15, 3),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', '2の平方根は？', 'multiple_choice', '["1", "1.414", "2", "4"]', '1.414', 10, 1);

-- アクティブな問題の設定
INSERT INTO active_questions (quiz_id, question_id, activated_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW());
  `

  // テーブル確認用のSQL
  const checkTablesSql = `
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
  `

  // Supabaseクライアントの作成
  const getSupabaseClient = () => {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL and Key are required")
    }
    return createClient(supabaseUrl, supabaseKey)
  }

  // SQLの実行
  const executeSql = async (sql: string) => {
    setLoading(true)
    setResult(null)

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc("exec_sql", { query: sql })

      if (error) throw error

      setResult({
        success: true,
        message: "SQLが正常に実行されました",
        data,
      })
    } catch (err) {
      console.error("SQL execution error:", err)
      setResult({
        success: false,
        message: `エラーが発生しました: ${err instanceof Error ? err.message : String(err)}`,
        error: err,
      })
    } finally {
      setLoading(false)
    }
  }

  // テーブルの確認
  const checkTables = async () => {
    await executeSql(checkTablesSql)
  }

  // テーブルの作成
  const createTables = async () => {
    await executeSql(createTablesSql)
  }

  // 関数とポリシーの作成
  const createFunctionsAndPolicies = async () => {
    await executeSql(createFunctionsAndPoliciesSql)
  }

  // テストデータの作成
  const createTestData = async () => {
    await executeSql(createTestDataSql)
  }

  // カスタムSQLの実行
  const executeCustomSql = async () => {
    if (!customSql.trim()) {
      setResult({
        success: false,
        message: "SQLを入力してください",
      })
      return
    }
    await executeSql(customSql)
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">データベースセットアップ</h1>
      <p className="mb-6 text-muted-foreground">
        このページでは、アプリケーションに必要なデータベーステーブルを作成・管理できます。
      </p>

      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Supabase接続設定</CardTitle>
            <CardDescription>Supabaseの接続情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="supabaseUrl" className="text-sm font-medium">
                Supabase URL
              </label>
              <input
                id="supabaseUrl"
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="https://your-project.supabase.co"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="supabaseKey" className="text-sm font-medium">
                Supabase Anon Key
              </label>
              <input
                id="supabaseKey"
                type="text"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="your-anon-key"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={checkTables} disabled={loading} variant="outline" className="w-full">
              <Database className="mr-2 h-4 w-4" />
              接続テスト
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="tables">
        <TabsList className="mb-4">
          <TabsTrigger value="tables">テーブル作成</TabsTrigger>
          <TabsTrigger value="policies">関数とポリシー</TabsTrigger>
          <TabsTrigger value="testdata">テストデータ</TabsTrigger>
          <TabsTrigger value="custom">カスタムSQL</TabsTrigger>
        </TabsList>

        <TabsContent value="tables">
          <Card>
            <CardHeader>
              <CardTitle>テーブル作成</CardTitle>
              <CardDescription>アプリケーションに必要なテーブルを作成します</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={createTablesSql} readOnly className="font-mono text-xs h-64 overflow-auto" />
            </CardContent>
            <CardFooter>
              <Button onClick={createTables} disabled={loading} className="w-full">
                <Play className="mr-2 h-4 w-4" />
                テーブルを作成
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>関数とポリシー作成</CardTitle>
              <CardDescription>必要な関数とRLSポリシーを作成します</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={createFunctionsAndPoliciesSql}
                readOnly
                className="font-mono text-xs h-64 overflow-auto"
              />
            </CardContent>
            <CardFooter>
              <Button onClick={createFunctionsAndPolicies} disabled={loading} className="w-full">
                <Play className="mr-2 h-4 w-4" />
                関数とポリシーを作成
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="testdata">
          <Card>
            <CardHeader>
              <CardTitle>テストデータ作成</CardTitle>
              <CardDescription>テスト用のクイズと問題を作成します</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={createTestDataSql} readOnly className="font-mono text-xs h-64 overflow-auto" />
            </CardContent>
            <CardFooter>
              <Button onClick={createTestData} disabled={loading} className="w-full">
                <Play className="mr-2 h-4 w-4" />
                テストデータを作成
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>カスタムSQL実行</CardTitle>
              <CardDescription>任意のSQLを実行できます</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={customSql}
                onChange={(e) => setCustomSql(e.target.value)}
                placeholder="実行したいSQLを入力してください"
                className="font-mono text-xs h-64"
              />
            </CardContent>
            <CardFooter>
              <Button onClick={executeCustomSql} disabled={loading} className="w-full">
                <Play className="mr-2 h-4 w-4" />
                SQLを実行
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="mt-6 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">実行中...</span>
        </div>
      )}

      {result && (
        <Alert className={`mt-6 ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertTitle>{result.success ? "成功" : "エラー"}</AlertTitle>
          <AlertDescription>
            <p className={result.success ? "text-green-600" : "text-red-600"}>{result.message}</p>
            {result.data && (
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs max-h-64">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
