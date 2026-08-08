"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CirclePlus, FileQuestion, Loader2, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth/auth-context"
import { supabase } from "@/lib/supabase/supabase"

export default function CreateQuizPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) router.replace("/admin/login")
  }, [user, isLoading, router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

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
      const generateQuizCode = () => Math.floor(1000 + Math.random() * 9000).toString()
      let quizCode = generateQuizCode()
      let attempts = 0

      while (attempts < 10) {
        const { data: existingQuiz } = await supabase.from("quizzes").select("id").eq("code", quizCode).single()
        if (!existingQuiz) break
        quizCode = generateQuizCode()
        attempts += 1
      }

      if (attempts >= 10) throw new Error("ユニークなクイズコードの生成に失敗しました")

      const { data: quiz, error: insertError } = await supabase
        .from("quizzes")
        .insert([
          {
            title: title.trim(),
            description: description.trim() || null,
            code: quizCode,
            admin_id: user.id,
            is_active: false,
          },
        ])
        .select()
        .single()

      if (insertError) throw new Error(`クイズの作成に失敗しました: ${insertError.message}`)
      if (!quiz) throw new Error("クイズの作成に失敗しました")

      router.push(`/admin/quiz/${quiz.id}`)
    } catch (err) {
      console.error("Error creating quiz:", err)
      setError(err instanceof Error ? err.message : "エラーが発生しました。もう一度お試しください")
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="brand-loading"><Loader2 className="h-4 w-4 animate-spin" />読み込み中...</div></div>
  }

  return (
    <main className="brand-page">
      <div className="brand-shell max-w-5xl">
        <header className="brand-header">
          <div className="flex items-center gap-4">
            <div className="brand-logo-frame"><img src="/icon.png" alt="Quiz App" /></div>
            <div>
              <p className="brand-kicker">CREATE DIGITAL QUIZ</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">新しいクイズを作成</h1>
              <p className="mt-1 text-sm text-white/60">まず基本情報を入力して、次の画面で問題を追加します。</p>
            </div>
          </div>
        </header>

        <div className="brand-content">
          <Button asChild variant="ghost" className="mb-5 -ml-2 rounded-xl"><Link href="/admin/dashboard"><ArrowLeft className="h-4 w-4" />ダッシュボードに戻る</Link></Button>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            <section className="brand-panel p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1c8] text-[#1d82e2]"><FileQuestion className="h-5 w-5" /></div>
                <div><p className="brand-label">QUIZ INFORMATION</p><h2 className="mt-1 text-xl font-black text-[#8f360f]">基本情報</h2></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-bold text-[#9f4719]">クイズタイトル <span className="text-red-500">*</span></label>
                  <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例：救急救命クイズ 2026" maxLength={100} disabled={loading} className="h-12" />
                  <p className="text-xs text-[#b76534]">一覧画面や参加画面に表示される名前です。</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-bold text-[#9f4719]">説明 <span className="font-normal text-[#ca8b64]">（任意）</span></label>
                  <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="クイズのテーマや対象者など" maxLength={500} rows={5} disabled={loading} />
                </div>

                {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

                <Button type="submit" className="h-12 w-full rounded-xl bg-[#f27a22] text-base font-black text-white hover:bg-[#e26714]" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />作成中...</> : <><CirclePlus className="h-5 w-5" />クイズを作成して問題編集へ</>}
                </Button>
              </form>
            </section>

            <aside className="space-y-4">
              <div className="brand-panel p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffe5bb] text-[#f27a22]"><Sparkles className="h-5 w-5" /></div>
                <h3 className="mt-4 text-lg font-black text-[#8f360f]">このあとできること</h3>
                <div className="mt-4 space-y-3 text-sm leading-6 text-[#b76534]">
                  <p>問題文・選択肢・正解・配点を設定できます。</p>
                  <p>参加用QRコードやアクセスコードを発行できます。</p>
                  <p>参加者・回答・ランキングをリアルタイムで管理できます。</p>
                </div>
              </div>

              <Link href="/admin/scoreboard" className="brand-action-card bg-[linear-gradient(135deg,#fff4cf,#ffd7a5)]">
                <div><p className="brand-label">NO DIGITAL QUESTIONS?</p><p className="mt-2 font-black text-[#8f360f]">アナログクイズなら</p><p className="mt-1 text-sm text-[#b76534]">スコアボードだけ使えます</p></div>
                <div className="brand-action-icon bg-[linear-gradient(180deg,#ffd85e_0%,#f2a51a_100%)]"><Sparkles className="h-5 w-5" /></div>
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
