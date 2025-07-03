"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { generateUniqueCode } from "@/lib/utils/generate-code"
import { supabase } from "@/lib/supabase/supabase"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"

export default function CreateQuizPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
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

    if (!title.trim()) {
      setError("タイトルを入力してください")
      return
    }

    setLoading(true)

    try {
      // Generate unique code for the quiz
      const code = await generateUniqueCode()

      // Create a new quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title,
          description,
          code,
          admin_id: user?.id,
          is_active: false,
          created_at: new Date().toISOString(),
          // 新しいフィールドのデフォルト値を設定
          time_limit_per_question: 30,
          theme_color: "pastel-blue",
        })
        .select()
        .single()

      if (quizError) {
        console.error("Quiz creation error:", quizError)
        setError("クイズを作成できませんでした。もう一度お試しください")
        setLoading(false)
        return
      }

      // Redirect to quiz editor
      router.push(`/admin/quiz/${quiz.id}`)
    } catch (err) {
      console.error("Error creating quiz:", err)
      setError("エラーが発生しました。もう一度お試しください")
      setLoading(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <p>読み込み中...</p>
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
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "作成中..." : "クイズを作成"}
            </Button>
          </form>
        </QuizCard>
      </div>
    </div>
  )
}
