"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import { supabase } from "@/lib/supabase/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Quiz } from "@/lib/supabase/schema"
import { Trash2, Loader2 } from "lucide-react"
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
    // Redirect if not authenticated
    if (!isLoading && !user) {
      router.push("/admin/login")
    } else if (user) {
      // Fetch quizzes
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

  // クイズを削除する関数
  const deleteQuiz = async (quizId: string) => {
    try {
      setDeletingQuizId(quizId)

      // APIエンドポイントを使用してクイズを削除
      const response = await fetch(`/api/quiz/${quizId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "クイズの削除に失敗しました")
      }

      // 成功した場合、クイズリストを更新
      setQuizzes(quizzes.filter((quiz) => quiz.id !== quizId))

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

  if (isLoading || !user) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
        <div className="flex items-center space-x-4">
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Button variant="outline" onClick={() => signOut()}>
            ログアウト
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">クイズ一覧</h2>
        <Button asChild>
          <Link href="/admin/create">新しいクイズを作成</Link>
        </Button>
      </div>

      {loading ? (
        <p>クイズを読み込み中...</p>
      ) : quizzes.length === 0 ? (
        <QuizCard
          title="クイズがありません"
          description="新しいクイズを作成してみましょう"
          gradient="pink"
          footer={
            <Button asChild className="w-full">
              <Link href="/admin/create">クイズを作成</Link>
            </Button>
          }
        >
          <div className="py-8 text-center text-muted-foreground">
            <p>まだクイズが作成されていません。</p>
            <p>「クイズを作成」ボタンをクリックして、最初のクイズを作成しましょう。</p>
          </div>
        </QuizCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              title={quiz.title}
              description={quiz.description || "説明なし"}
              gradient={quiz.is_active ? "green" : "blue"}
              footer={
                <div className="w-full flex justify-between">
                  <Button asChild className="flex-1 mr-2">
                    <Link href={`/admin/quiz/${quiz.id}`}>管理する</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>クイズを削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                          この操作は元に戻せません。クイズ「{quiz.title}
                          」とすべての関連データ（問題、参加者、回答など）が完全に削除されます。
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
                            <span className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              削除中...
                            </span>
                          ) : (
                            "削除する"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              }
            >
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">コード:</span>
                  <span className="text-sm font-bold">{quiz.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">ステータス:</span>
                  <span className={`text-sm font-bold ${quiz.is_active ? "text-green-600" : "text-gray-500"}`}>
                    {quiz.is_active ? "アクティブ" : "非アクティブ"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">作成日:</span>
                  <span className="text-sm">{new Date(quiz.created_at).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>
            </QuizCard>
          ))}
        </div>
      )}
    </div>
  )
}
