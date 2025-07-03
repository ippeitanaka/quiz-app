"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/supabase"
import { generateCode } from "@/lib/utils/generate-code"

export default function TestQuizPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [quizCode, setQuizCode] = useState("")
  const [existingQuizzes, setExistingQuizzes] = useState<any[]>([])

  // Supabase接続テスト
  const testConnection = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("quizzes").select("*").limit(10)
      setResult({
        success: !error,
        message: error ? `Error: ${error.message}` : "Connection successful",
        data: data,
      })
      if (data) {
        setExistingQuizzes(data)
      }
    } catch (err) {
      setResult({
        success: false,
        message: `Exception: ${err instanceof Error ? err.message : String(err)}`,
        error: err,
      })
    } finally {
      setLoading(false)
    }
  }

  // テストクイズ作成
  const createTestQuiz = async () => {
    setLoading(true)
    try {
      const code = quizCode || generateCode()
      setQuizCode(code)

      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          title: `テストクイズ ${code}`,
          description: "テスト用に作成されたクイズです",
          code: code,
          admin_id: "test-admin",
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()

      setResult({
        success: !error,
        message: error ? `Error: ${error.message}` : "Quiz created successfully",
        data: data,
      })

      if (!error) {
        testConnection() // 既存のクイズリストを更新
      }
    } catch (err) {
      setResult({
        success: false,
        message: `Exception: ${err instanceof Error ? err.message : String(err)}`,
        error: err,
      })
    } finally {
      setLoading(false)
    }
  }

  // クイズをアクティブ/非アクティブに切り替え
  const toggleQuizActive = async (id: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase.from("quizzes").update({ is_active: !currentStatus }).eq("id", id).select()

      if (error) throw error

      setExistingQuizzes((prev) => prev.map((quiz) => (quiz.id === id ? { ...quiz, is_active: !currentStatus } : quiz)))

      setResult({
        success: true,
        message: `Quiz ${!currentStatus ? "activated" : "deactivated"} successfully`,
        data,
      })
    } catch (err) {
      setResult({
        success: false,
        message: `Failed to update quiz: ${err instanceof Error ? err.message : String(err)}`,
        error: err,
      })
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">クイズテストツール</h1>

      <div className="space-y-8">
        {/* Supabase接続テスト */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Supabase接続テスト</h2>
          <Button onClick={testConnection} disabled={loading}>
            {loading ? "テスト中..." : "接続テスト実行"}
          </Button>
        </div>

        {/* テストクイズ作成 */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">テストクイズ作成</h2>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="4桁のコード (空欄でランダム生成)"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value)}
              maxLength={4}
              className="max-w-xs"
            />
            <Button onClick={createTestQuiz} disabled={loading}>
              {loading ? "作成中..." : "テストクイズを作成"}
            </Button>
          </div>
        </div>

        {/* 結果表示 */}
        {result && (
          <div className={`p-4 border rounded-lg ${result.success ? "bg-green-50" : "bg-red-50"}`}>
            <h2 className="text-xl font-semibold mb-2">結果</h2>
            <p className={result.success ? "text-green-600" : "text-red-600"}>{result.message}</p>
            {result.data && (
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* 既存のクイズ一覧 */}
        {existingQuizzes.length > 0 && (
          <div className="p-4 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">既存のクイズ一覧</h2>
            <div className="space-y-4">
              {existingQuizzes.map((quiz) => (
                <div key={quiz.id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">{quiz.title}</p>
                    <p className="text-sm text-gray-500">コード: {quiz.code}</p>
                    <p className="text-sm text-gray-500">
                      ステータス:
                      <span className={quiz.is_active ? "text-green-600" : "text-red-600"}>
                        {quiz.is_active ? " アクティブ" : " 非アクティブ"}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={quiz.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleQuizActive(quiz.id, quiz.is_active)}
                    >
                      {quiz.is_active ? "非アクティブにする" : "アクティブにする"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`/join/${quiz.code}`, "_blank")}>
                      参加リンク
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
