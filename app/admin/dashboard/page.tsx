"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CalendarDays,
  CirclePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  PlayCircle,
  Trash2,
  Trophy,
} from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/supabase"
import type { Quiz } from "@/lib/supabase/schema"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function AdminDashboardPage() {
  const { user, signOut, isLoading } = useAuth()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/admin/login")
    } else if (user) {
      fetchQuizzes()
    }
  }, [user, isLoading, router])

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false })
      if (error) throw error
      setQuizzes((data as Quiz[]) || [])
    } catch (err) {
      console.error("Error fetching quizzes:", err)
    } finally {
      setLoading(false)
    }
  }

  const deleteQuiz = async (quizId: string) => {
    try {
      setDeletingQuizId(quizId)
      const response = await fetch(`/api/quiz/${quizId}`, { method: "DELETE" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "クイズの削除に失敗しました")

      setQuizzes((current) => current.filter((quiz) => quiz.id !== quizId))
      toast({ title: "クイズを削除しました", description: "クイズとすべての関連データが削除されました" })
    } catch (error) {
      console.error("Error deleting quiz:", error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "クイズの削除中にエラーが発生しました",
        variant: "destructive",
      })
    } finally {
      setDeletingQuizId(null)
    }
  }

  const activeCount = useMemo(() => quizzes.filter((quiz) => quiz.is_active).length, [quizzes])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="brand-loading"><Loader2 className="h-4 w-4 animate-spin" />ダッシュボードを読み込んでいます</div>
      </div>
    )
  }

  return (
    <main className="brand-page">
      <div className="brand-shell max-w-7xl">
        <header className="brand-header">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="brand-logo-frame"><img src="/icon.png" alt="Quiz App" /></div>
              <div>
                <p className="brand-kicker">QUIZ MANAGEMENT</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">管理ダッシュボード</h1>
                <p className="mt-1 text-sm text-white/60">デジタルクイズもアナログクイズも、ここから管理できます。</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-right sm:block">
                <p className="text-[10px] font-bold tracking-wider text-white/55">SIGNED IN</p>
                <p className="max-w-52 truncate text-sm font-bold text-white/90">{user.email}</p>
              </div>
              <Button variant="outline" onClick={() => signOut()} className="brand-header-button"><LogOut className="h-4 w-4" />ログアウト</Button>
            </div>
          </div>
        </header>

        <div className="brand-content">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="brand-panel p-5">
              <div className="flex items-center justify-between">
                <div><p className="brand-label">TOTAL QUIZZES</p><p className="mt-2 text-3xl font-black text-[#8f360f]">{loading ? "—" : quizzes.length}</p></div>
                <div className="rounded-2xl bg-[#fff1c8] p-3 text-[#1d82e2]"><LayoutDashboard className="h-6 w-6" /></div>
              </div>
              <p className="mt-3 text-sm text-[#b76534]">作成済みのデジタルクイズ</p>
            </div>

            <div className="brand-panel p-5">
              <div className="flex items-center justify-between">
                <div><p className="brand-label">ACTIVE</p><p className="mt-2 text-3xl font-black text-[#8f360f]">{loading ? "—" : activeCount}</p></div>
                <div className="rounded-2xl bg-[#ffe5bb] p-3 text-[#f27a22]"><PlayCircle className="h-6 w-6" /></div>
              </div>
              <p className="mt-3 text-sm text-[#b76534]">現在アクティブなクイズ</p>
            </div>

            <Link href="/admin/scoreboard" className="group brand-action-card bg-[linear-gradient(135deg,#fff4cf_0%,#ffd7a5_100%)]">
              <div>
                <p className="brand-label">ANALOG QUIZ</p>
                <p className="mt-2 text-lg font-black text-[#8f360f]">スコアボード</p>
                <p className="mt-2 text-sm leading-5 text-[#b76534]">参加者・得点・チャレンジを管理</p>
              </div>
              <div className="brand-action-icon bg-[linear-gradient(180deg,#ffd85e_0%,#f2a51a_100%)]"><Trophy className="h-6 w-6" /></div>
            </Link>

            <Link href="/admin/create" className="group brand-action-card bg-[linear-gradient(135deg,#fff7dd_0%,#ffe7c2_100%)]">
              <div>
                <p className="brand-label">CREATE NEW</p>
                <p className="mt-2 text-lg font-black text-[#8f360f]">新しいクイズを作成</p>
                <p className="mt-2 text-sm leading-5 text-[#b76534]">デジタルクイズを新規作成</p>
              </div>
              <div className="brand-action-icon"><CirclePlus className="h-6 w-6" /></div>
            </Link>
          </section>

          <section className="mt-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="brand-label">YOUR QUIZZES</p><h2 className="mt-1 text-2xl font-bold text-[#8f360f]">クイズ一覧</h2></div>
              <Button asChild className="h-11 rounded-xl bg-[#f27a22] font-bold text-white hover:bg-[#e26714]"><Link href="/admin/create"><CirclePlus className="h-4 w-4" />クイズを作成</Link></Button>
            </div>

            {loading ? (
              <div className="flex min-h-52 items-center justify-center rounded-3xl border border-dashed border-[#f3bd87] bg-white/55">
                <div className="flex items-center gap-3 text-sm font-bold text-[#b76534]"><Loader2 className="h-4 w-4 animate-spin" />クイズを読み込んでいます</div>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#f3bd87] bg-white/60 px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff1c8] text-[#1d82e2]"><LayoutDashboard className="h-7 w-7" /></div>
                <h3 className="mt-5 text-xl font-bold text-[#8f360f]">まだクイズがありません</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#b76534]">最初のクイズを作成すると、ここから管理・編集できます。</p>
                <Button asChild className="mt-6 rounded-xl bg-[#f27a22] font-bold text-white hover:bg-[#e26714]"><Link href="/admin/create">最初のクイズを作成</Link></Button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {quizzes.map((quiz) => (
                  <article key={quiz.id} className="brand-quiz-card">
                    <div className="h-1.5 bg-gradient-to-r from-[#ff6d5f] via-[#f27a22] to-[#42b3fb]" />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${quiz.is_active ? "bg-[#b7ea35]" : "bg-slate-300"}`} />
                            <span className="text-[11px] font-bold tracking-wider text-[#c17a49]">{quiz.is_active ? "ACTIVE" : "INACTIVE"}</span>
                          </div>
                          <h3 className="truncate text-xl font-bold text-[#8f360f]">{quiz.title}</h3>
                          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#b76534]">{quiz.description || "説明なし"}</p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#fff4de] p-3">
                        <div><p className="text-[10px] font-bold tracking-wider text-[#d08d58]">ACCESS CODE</p><p className="mt-1 font-mono text-base font-bold tracking-wider text-[#8f360f]">{quiz.code}</p></div>
                        <div><p className="text-[10px] font-bold tracking-wider text-[#d08d58]">CREATED</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#b76534]"><CalendarDays className="h-3.5 w-3.5" />{new Date(quiz.created_at).toLocaleDateString("ja-JP")}</p></div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Button asChild className="h-11 flex-1 rounded-xl bg-[#f27a22] font-bold text-white hover:bg-[#e26714]"><Link href={`/admin/quiz/${quiz.id}`}>管理する<ArrowRight className="h-4 w-4" /></Link></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600" aria-label={`${quiz.title}を削除`}><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>クイズを削除しますか？</AlertDialogTitle><AlertDialogDescription>この操作は元に戻せません。クイズ「{quiz.title}」とすべての関連データが完全に削除されます。</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => deleteQuiz(quiz.id)} className="bg-red-500 hover:bg-red-600" disabled={deletingQuizId === quiz.id}>{deletingQuizId === quiz.id ? <span className="flex items-center"><Loader2 className="h-4 w-4 animate-spin" />削除中...</span> : "削除する"}</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
