"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Quiz } from "@/lib/supabase/schema"
import {
  ArrowRight,
  CalendarDays,
  CirclePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  MoreVertical,
  PlayCircle,
  Trash2,
} from "lucide-react"
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
      setQuizzes(data as Quiz[])
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
      toast({
        title: "クイズを削除しました",
        description: "クイズとすべての関連データが削除されました",
      })
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
        <div className="flex items-center gap-3 rounded-full border border-emerald-900/10 bg-white/70 px-5 py-3 text-sm font-bold text-emerald-950 shadow-sm backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin" />
          ダッシュボードを読み込んでいます
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[#fffdf5]/85 shadow-[0_24px_80px_rgba(30,68,48,0.15)] backdrop-blur">
        <header className="border-b border-emerald-950/10 bg-[linear-gradient(120deg,#173f32_0%,#245845_55%,#2f6e56_100%)] px-5 py-5 text-white sm:px-7 lg:px-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-lg">
                <img src="/icon.png" alt="Quiz App" className="h-full w-full object-contain drop-shadow-md" />
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-[0.22em] text-[#f3cf78]">QUIZ MANAGEMENT</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">管理ダッシュボード</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-right sm:block">
                <p className="text-[10px] font-bold tracking-wider text-white/55">SIGNED IN</p>
                <p className="max-w-52 truncate text-sm font-bold text-white/90">{user.email}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => signOut()}
                className="h-11 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </Button>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-7 lg:p-9">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-950/10 bg-white/75 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-wider text-[#6a7c74]">TOTAL QUIZZES</p>
                  <p className="mt-2 text-3xl font-bold text-[#193c31]">{loading ? "—" : quizzes.length}</p>
                </div>
                <div className="rounded-2xl bg-[#e4efe8] p-3 text-[#245845]">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
              </div>
              <p className="mt-3 text-sm text-[#718078]">作成済みのクイズ総数</p>
            </div>

            <div className="rounded-2xl border border-emerald-950/10 bg-white/75 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-wider text-[#6a7c74]">ACTIVE</p>
                  <p className="mt-2 text-3xl font-bold text-[#193c31]">{loading ? "—" : activeCount}</p>
                </div>
                <div className="rounded-2xl bg-[#f5ebcf] p-3 text-[#8a6b24]">
                  <PlayCircle className="h-6 w-6" />
                </div>
              </div>
              <p className="mt-3 text-sm text-[#718078]">現在アクティブなクイズ</p>
            </div>

            <Link
              href="/admin/create"
              className="group rounded-2xl border border-[#2d664f]/20 bg-[linear-gradient(135deg,#eff6e9_0%,#f8f1db_100%)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-full items-center justify-between gap-5">
                <div>
                  <p className="text-xs font-bold tracking-wider text-[#5f756a]">CREATE NEW</p>
                  <p className="mt-2 text-lg font-bold text-[#193c31]">新しいクイズを作成</p>
                  <p className="mt-2 text-sm text-[#718078]">問題作成をはじめる</p>
                </div>
                <div className="rounded-2xl bg-[#1f5a46] p-3 text-white shadow-[0_10px_22px_rgba(31,90,70,0.2)] transition group-hover:scale-105">
                  <CirclePlus className="h-6 w-6" />
                </div>
              </div>
            </Link>
          </section>

          <section className="mt-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-[#7d8d85]">YOUR QUIZZES</p>
                <h2 className="mt-1 text-2xl font-bold text-[#193c31]">クイズ一覧</h2>
              </div>
              <Button asChild className="h-11 rounded-xl bg-[#1f5a46] font-bold text-white hover:bg-[#184b3a]">
                <Link href="/admin/create">
                  <CirclePlus className="mr-2 h-4 w-4" />
                  クイズを作成
                </Link>
              </Button>
            </div>

            {loading ? (
              <div className="flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-emerald-950/15 bg-white/55">
                <div className="flex items-center gap-3 text-sm font-bold text-[#61756b]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  クイズを読み込んでいます
                </div>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-emerald-950/15 bg-white/60 px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e5efe7] text-[#2d664f]">
                  <LayoutDashboard className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#193c31]">まだクイズがありません</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718078]">最初のクイズを作成すると、ここから管理・編集できます。</p>
                <Button asChild className="mt-6 rounded-xl bg-[#1f5a46] font-bold text-white hover:bg-[#184b3a]">
                  <Link href="/admin/create">最初のクイズを作成</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {quizzes.map((quiz) => (
                  <article
                    key={quiz.id}
                    className="group overflow-hidden rounded-3xl border border-emerald-950/10 bg-white/80 shadow-[0_12px_32px_rgba(45,79,59,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(45,79,59,0.13)]"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-[#245845] via-[#5d9677] to-[#f0cf77]" />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${quiz.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                            <span className="text-[11px] font-bold tracking-wider text-[#7a8b82]">
                              {quiz.is_active ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                          <h3 className="truncate text-xl font-bold text-[#193c31]">{quiz.title}</h3>
                          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#718078]">{quiz.description || "説明なし"}</p>
                        </div>
                        <MoreVertical className="h-5 w-5 shrink-0 text-[#9aa69f]" />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#f3f6ee] p-3">
                        <div>
                          <p className="text-[10px] font-bold tracking-wider text-[#89958f]">ACCESS CODE</p>
                          <p className="mt-1 font-mono text-base font-bold tracking-wider text-[#284a3d]">{quiz.code}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold tracking-wider text-[#89958f]">CREATED</p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#52675d]">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {new Date(quiz.created_at).toLocaleDateString("ja-JP")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Button asChild className="h-11 flex-1 rounded-xl bg-[#1f5a46] font-bold text-white hover:bg-[#184b3a]">
                          <Link href={`/admin/quiz/${quiz.id}`}>
                            管理する
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-11 w-11 shrink-0 rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                              aria-label={`${quiz.title}を削除`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>クイズを削除しますか？</AlertDialogTitle>
                              <AlertDialogDescription>
                                この操作は元に戻せません。クイズ「{quiz.title}」とすべての関連データ（問題、参加者、回答など）が完全に削除されます。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteQuiz(quiz.id)}
                                className="bg-red-500 hover:bg-red-600"
                                disabled={deletingQuizId === quiz.id}
                              >
                                {deletingQuizId === quiz.id ? (
                                  <span className="flex items-center"><Loader2 className="mr-1 h-4 w-4 animate-spin" />削除中...</span>
                                ) : (
                                  "削除する"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
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
