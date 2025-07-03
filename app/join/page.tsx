"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import { supabase } from "@/lib/supabase/supabase"

export default function JoinPage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setDebugInfo(null)

    if (!code.trim()) {
      setError("コードを入力してください")
      return
    }

    setLoading(true)

    try {
      console.log("Checking quiz code:", code)

      // デバッグ情報を収集
      const debugData: any = {
        code,
        timestamp: new Date().toISOString(),
      }

      // クイズを直接検索
      const { data, error } = await supabase.from("quizzes").select("*").eq("code", code).single()

      debugData.queryResult = error ? "エラー" : "成功"
      debugData.errorMessage = error ? error.message : null
      debugData.errorDetails = error ? error.details : null
      debugData.data = data

      setDebugInfo(debugData)

      if (error) {
        console.error("Error checking quiz:", error)
        setError("クイズが見つかりませんでした。コードを確認してください。")
        setLoading(false)
        return
      }

      if (!data.is_active) {
        setError("このクイズは現在アクティブではありません。")
        setLoading(false)
        return
      }

      // クイズが見つかった場合は参加ページに移動
      router.push(`/join/${code}`)
    } catch (err) {
      console.error("Error in handleSubmit:", err)
      setError("エラーが発生しました。もう一度お試しください。")
      setDebugInfo({
        code,
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : null,
      })
      setLoading(false)
    }
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <div className="w-full max-w-md">
        <QuizCard title="クイズに参加" description="4桁のコードを入力してください" gradient="blue">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                クイズコード
              </label>
              <Input
                id="code"
                type="text"
                placeholder="4桁のコードを入力"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={4}
                className="text-center text-2xl tracking-widest"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "確認中..." : "参加する"}
            </Button>
          </form>

          {/* デバッグ情報 */}
          {debugInfo && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-left">
              <details>
                <summary className="cursor-pointer font-medium">デバッグ情報</summary>
                <pre className="mt-2 overflow-auto p-2 bg-gray-100 rounded">{JSON.stringify(debugInfo, null, 2)}</pre>
              </details>
            </div>
          )}
        </QuizCard>
      </div>
    </div>
  )
}
