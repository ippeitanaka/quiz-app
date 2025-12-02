"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import { useRouter } from "next/navigation"
import { RefreshCw, AlertCircle, Loader2, ExternalLink, Bug, Bell } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Quiz {
  id: string
  title: string
  code: string
  is_active: boolean
  created_by?: string
  description?: string
}

export default function JoinQuizPage({ params }: { params: { code: string } }) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [showDebug, setShowDebug] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [mode, setMode] = useState<"quiz" | "buzzer">("quiz")
  const router = useRouter()

  // クイズ情報を取得（複数の方法を試行）
  useEffect(() => {
    async function fetchQuiz() {
      setLoading(true)
      setError(null)

      const debug = {
        code: params.code,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        retryCount,
        methods: [],
      }

      try {
        console.log("=== FETCHING QUIZ (Attempt", retryCount + 1, ") ===")
        console.log("Code:", params.code)

        // 方法1: APIエンドポイント経由
        try {
          debug.methods.push({ method: "API", status: "attempting" })

          const apiUrl = `/api/quiz/check-code?code=${encodeURIComponent(params.code)}`
          console.log("Trying API:", apiUrl)

          const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          })

          console.log("API Response:", response.status, response.ok)

          if (response.ok) {
            const responseData = await response.json()
            console.log("API Success:", responseData)

            if (responseData.success && responseData.data) {
              debug.methods[0].status = "success"
              debug.methods[0].data = responseData.data
              setQuiz(responseData.data)

              if (!responseData.data.is_active) {
                setError(
                  "このクイズは現在アクティブではありません。管理者がクイズをアクティブにするのをお待ちください。",
                )
              }

              debug.success = true
              setDebugInfo(debug)
              setLoading(false)
              return
            }
          } else {
            const errorData = await response.json()
            debug.methods[0].status = "failed"
            debug.methods[0].error = errorData
            console.log("API Failed:", errorData)
          }
        } catch (apiError) {
          debug.methods[0].status = "error"
          debug.methods[0].error = apiError instanceof Error ? apiError.message : String(apiError)
          console.log("API Error:", apiError)
        }

        // 方法2: 直接Supabase接続（フォールバック）
        try {
          debug.methods.push({ method: "Direct Supabase", status: "attempting" })

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

          console.log("Trying direct Supabase:", { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey })

          if (supabaseUrl && supabaseKey) {
            const { createClient } = await import("@supabase/supabase-js")
            const supabase = createClient(supabaseUrl, supabaseKey, {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
              },
            })

            const { data, error: supabaseError } = await supabase
              .from("quizzes")
              .select("*")
              .eq("code", params.code)
              .maybeSingle()

            if (supabaseError) {
              debug.methods[1].status = "failed"
              debug.methods[1].error = supabaseError.message
              console.log("Direct Supabase Failed:", supabaseError)
            } else if (data) {
              debug.methods[1].status = "success"
              debug.methods[1].data = data
              console.log("Direct Supabase Success:", data)

              setQuiz(data)

              if (!data.is_active) {
                setError(
                  "このクイズは現在アクティブではありません。管理者がクイズをアクティブにするのをお待ちください。",
                )
              }

              debug.success = true
              setDebugInfo(debug)
              setLoading(false)
              return
            } else {
              debug.methods[1].status = "no_data"
              console.log("Direct Supabase: No data found")
            }
          } else {
            debug.methods[1].status = "no_env"
            debug.methods[1].error = "Environment variables not available"
            console.log("Direct Supabase: Environment variables not available")
          }
        } catch (directError) {
          debug.methods[1].status = "error"
          debug.methods[1].error = directError instanceof Error ? directError.message : String(directError)
          console.log("Direct Supabase Error:", directError)
        }

        // すべての方法が失敗した場合
        console.log("All methods failed")
        setError("クイズ情報の取得に失敗しました。しばらく時間をおいてから再度お試しください。")
        debug.allMethodsFailed = true
        setDebugInfo(debug)
      } catch (err) {
        console.error("Exception in fetchQuiz:", err)
        setError("予期せぬエラーが発生しました。ページを再読み込みしてください。")
        debug.exception = {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : "",
        }
        setDebugInfo(debug)
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()

    // クイズがアクティブでない場合は定期的に更新
    const intervalId = setInterval(() => {
      if (quiz && !quiz.is_active) {
        console.log("Auto-refreshing quiz status...")
        fetchQuiz()
      }
    }, 5000)

    return () => clearInterval(intervalId)
  }, [params.code, retryCount])

  // 手動再試行
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  // 参加処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("名前を入力してください")
      return
    }

    if (!quiz) {
      setError("クイズ情報が取得できませんでした")
      return
    }

    if (!quiz.is_active) {
      setError("このクイズは現在アクティブではありません")
      return
    }

    setSubmitting(true)

    try {
      console.log("=== CREATING PARTICIPANT ===")
      console.log("Quiz ID:", quiz.id)
      console.log("Name:", name.trim())

      // APIエンドポイント経由で参加者を作成
      const response = await fetch("/api/quiz/participants/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId: quiz.id,
          name: name.trim(),
        }),
      })

      console.log("Participant creation response:", response.status, response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Participant creation error:", errorData)
        setError(errorData.error || "参加登録に失敗しました")
        setSubmitting(false)
        return
      }

      const responseData = await response.json()
      console.log("Participant creation data:", responseData)

      if (!responseData.success || !responseData.data) {
        setError("参加登録に失敗しました")
        setSubmitting(false)
        return
      }

      console.log("Participant created successfully:", responseData.data.id)

      // クイズページまたは早押しページに遷移
      const playUrl =
        mode === "buzzer"
          ? `/buzzer/${params.code}?participant=${responseData.data.id}`
          : `/play/${params.code}?participant=${responseData.data.id}`
      console.log("Redirecting to:", playUrl)
      router.push(playUrl)
    } catch (err) {
      console.error("Exception in handleSubmit:", err)
      setError("参加登録中にエラーが発生しました。もう一度お試しください。")
      setSubmitting(false)
    }
  }

  // 表示内容を決定
  let content

  if (loading) {
    content = (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>クイズ情報を読み込み中...</p>
        <p className="text-xs text-muted-foreground mt-2">コード: {params.code}</p>
        {retryCount > 0 && <p className="text-xs text-muted-foreground">再試行中... ({retryCount + 1}回目)</p>}
      </div>
    )
  } else if (error && !quiz) {
    content = (
      <div className="text-center py-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        {/* デバッグ情報表示ボタン */}
        <div className="mt-4">
          <Button onClick={() => setShowDebug(!showDebug)} variant="outline" size="sm" className="mb-4">
            <Bug className="h-4 w-4 mr-2" />
            {showDebug ? "デバッグ情報を隠す" : "デバッグ情報を表示"}
          </Button>
        </div>

        {/* デバッグ情報 */}
        {showDebug && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-left">
            <h4 className="font-medium mb-2">デバッグ情報</h4>
            <pre className="overflow-auto p-2 bg-gray-100 rounded text-xs whitespace-pre-wrap max-h-64">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行 ({retryCount + 1}回目)
          </Button>

          <Button onClick={() => router.push("/join")} variant="outline" className="w-full">
            戻る
          </Button>
        </div>
      </div>
    )
  } else if (quiz && !quiz.is_active) {
    content = (
      <div className="text-center py-4">
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
          <AlertDescription className="text-amber-700">
            <div className="space-y-2">
              <p className="font-medium">このクイズは現在アクティブではありません</p>
              <p className="text-sm">管理者がクイズをアクティブにするのをお待ちください。</p>
              <p className="text-xs">（5秒ごとに自動更新されます）</p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="text-center text-sm text-muted-foreground mb-4 space-y-1">
          <p className="font-medium">クイズ: {quiz.title}</p>
          <p>コード: {quiz.code}</p>
          {quiz.description && <p>説明: {quiz.description}</p>}
        </div>

        {/* 管理者向けの情報 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-700 mb-2">
            <strong>管理者の方へ:</strong>
          </p>
          <p className="text-xs text-blue-600 mb-3">
            このクイズを開始するには、管理者ページでクイズをアクティブにしてください。
          </p>
          <Button
            onClick={() => window.open(`/admin/quiz/${quiz.id}`, "_blank")}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            管理者ページを開く
          </Button>
        </div>

        <div className="mt-4">
          <Button onClick={() => router.push("/join")} variant="outline" className="w-full">
            戻る
          </Button>
        </div>
      </div>
    )
  } else if (quiz) {
    content = (
      <div className="space-y-6">
        {/* モード選択タブ */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "quiz" | "buzzer")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quiz">クイズモード</TabsTrigger>
            <TabsTrigger value="buzzer">
              <Bell className="h-4 w-4 mr-1" />
              早押しモード
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quiz" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">問題に回答してスコアを競います</p>
          </TabsContent>

          <TabsContent value="buzzer" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">早押しボタンで競争します</p>
          </TabsContent>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              あなたの名前
            </label>
            <Input
              id="name"
              type="text"
              placeholder="ニックネームを入力してください"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              disabled={submitting}
              autoComplete="off"
            />
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                参加中...
              </>
            ) : mode === "buzzer" ? (
              <>
                <Bell className="mr-2 h-4 w-4" />
                早押しに参加
              </>
            ) : (
              "クイズに参加"
            )}
          </Button>

          {/* クイズ情報 */}
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p className="font-medium">クイズ: {quiz.title}</p>
            {quiz.description && <p>説明: {quiz.description}</p>}
            <p className="text-green-600">✓ アクティブ</p>
          </div>
        </form>
      </div>
    )
  } else {
    content = (
      <div className="text-center py-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>クイズ情報を取得できませんでした。もう一度お試しください。</AlertDescription>
        </Alert>

        <div className="mt-4">
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <div className="w-full max-w-md">
        <QuizCard title="クイズに参加" description={`クイズコード: ${params.code}`} gradient="blue">
          {content}
        </QuizCard>
      </div>
    </div>
  )
}
