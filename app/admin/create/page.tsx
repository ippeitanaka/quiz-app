"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"
import { createClient } from "@supabase/supabase-js"

export default function CreateQuizPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !user) {
      router.push("/admin/login")
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setDebugInfo(null)

    if (!title.trim()) {
      setError("タイトルを入力してください")
      return
    }

    if (!user) {
      setError("ログインが必要です")
      return
    }

    setLoading(true)

    try {
      console.log("Creating quiz with title:", title)
      console.log("User ID:", user.id)

      // 環境変数の確認
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      console.log("Environment variables check:", {
        url_exists: !!supabaseUrl,
        key_exists: !!supabaseAnonKey,
      })

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase環境変数が設定されていません")
      }

      // Supabaseクライアントを直接作成
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      // クイズコードを生成（4桁の数字）
      const generateQuizCode = () => {
        return Math.floor(1000 + Math.random() * 9000).toString()
      }

      let quizCode = generateQuizCode()
      let codeExists = true
      let attempts = 0

      // ユニークなコードを生成
      while (codeExists && attempts < 10) {
        const { data: existingQuiz } = await supabase.from("quizzes").select("id").eq("code", quizCode).single()

        if (!existingQuiz) {
          codeExists = false
        } else {
          quizCode = generateQuizCode()
          attempts++
        }
      }

      if (attempts >= 10) {
        throw new Error("ユニークなクイズコードの生成に失敗しました")
      }

      console.log("Generated quiz code:", quizCode)

      // クイズを作成（存在するカラムのみ使用）
      const quizData = {
        title: title.trim(),
        description: description.trim() || null,
        code: quizCode,
        admin_id: user.id,
        is_active: false,
      }

      console.log("Quiz data to insert:", quizData)

      const { data: quiz, error: insertError } = await supabase.from("quizzes").insert([quizData]).select().single()

      if (insertError) {
        console.error("Insert error:", insertError)
        setDebugInfo({
          error: insertError,
          quizData,
          timestamp: new Date().toISOString(),
        })
        throw new Error(`クイズの作成に失敗しました: ${insertError.message}`)
      }

      if (!quiz) {
        throw new Error("クイズの作成に失敗しました: データが返されませんでした")
      }

      console.log("Quiz created successfully:", quiz)

      // クイズ編集ページにリダイレクト
      router.push(`/admin/quiz/${quiz.id}`)
    } catch (err) {
      console.error("Error creating quiz:", err)

      const errorMessage = err instanceof Error ? err.message : "エラーが発生しました。もう一度お試しください"
      setError(errorMessage)

      // デバッグ情報を設定
      setDebugInfo({
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
        userExists: !!user,
        titleLength: title.length,
        environmentCheck: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <Link
        href="/admin/dashboard"
        className="absolute top-4 left-4 text-muted-foreground hover:text-primary transition"
      >
        ← ダッシュボードに戻る
      </Link>

      <div className="w-full max-w-2xl">
        <QuizCard title="新しいクイズを作成" description="クイズのタイトルと説明を入力してください" gradient="pink">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                クイズタイトル
              </label>
              <Input
                id="title"
                type="text"
                placeholder="例: 一般知識クイズ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                説明 (任意)
              </label>
              <Textarea
                id="description"
                placeholder="クイズの説明を入力してください"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-medium mb-2">エラー</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {debugInfo && process.env.NODE_ENV === "development" && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 font-medium mb-2">デバッグ情報</p>
                <pre className="text-xs text-gray-600 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  作成中...
                </div>
              ) : (
                "クイズを作成"
              )}
            </Button>
          </form>
        </QuizCard>
      </div>
    </div>
  )
}
