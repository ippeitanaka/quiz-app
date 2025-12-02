"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import { supabase } from "@/lib/supabase/supabase"
import { generateQRCode } from "@/lib/utils/qr-code"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { Quiz, Participant } from "@/lib/supabase/schema"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "@/hooks/use-toast"
import {
  RotateCcw,
  Trophy,
  Clock,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  X,
  AlertCircle,
  Users,
  Bell,
} from "lucide-react"
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

interface BuzzerResponse {
  id: string
  participant_id: string
  participant_name: string
  responded_at: string
  points_awarded: number
}

export default function AdminBuzzerPage({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [buzzerResponses, setBuzzerResponses] = useState<BuzzerResponse[]>([])
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [customPoints, setCustomPoints] = useState<Record<string, number>>({})
  const [awardingPoints, setAwardingPoints] = useState<string | null>(null)
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const buzzerUrl = quiz ? `${baseUrl}/buzzer/${quiz.code}` : ""

  // Check authentication
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/admin/login")
    }
  }, [user, isLoading, router])

  // Load quiz data
  useEffect(() => {
    if (isLoading || !user) return

    const fetchQuiz = async () => {
      try {
        const { data, error } = await supabase.from("quizzes").select("*").eq("id", params.id).single()

        if (error) throw error
        if (!data) throw new Error("クイズが見つかりませんでした")

        setQuiz(data as Quiz)

        // Generate QR code
        if (data && data.code) {
          const url = `${baseUrl}/buzzer/${data.code}`
          const qrDataUrl = await generateQRCode(url)
          setQrCode(qrDataUrl)
        }

        setLoading(false)
      } catch (err) {
        console.error("Error loading quiz:", err)
        setError(err instanceof Error ? err.message : "クイズの読み込みに失敗しました")
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [params.id, isLoading, user, baseUrl])

  // Load participants
  useEffect(() => {
    if (!quiz) return

    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from("participants")
          .select("*")
          .eq("quiz_id", quiz.id)
          .order("score", { ascending: false })

        if (error) throw error
        setParticipants((data as Participant[]) || [])
      } catch (err) {
        console.error("Error fetching participants:", err)
      }
    }

    fetchParticipants()

    // Subscribe to changes
    const subscription = supabase
      .channel("participants-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `quiz_id=eq.${quiz.id}`,
        },
        () => fetchParticipants(),
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [quiz])

  // Load buzzer responses
  useEffect(() => {
    if (!quiz) return

    const fetchBuzzerResponses = async () => {
      try {
        // まず早押し専用問題を取得
        const { data: buzzerQuestion, error: questionError } = await supabase
          .from("questions")
          .select("id")
          .eq("quiz_id", quiz.id)
          .eq("type", "quick_response")
          .eq("content", "早押し専用")
          .maybeSingle()

        if (questionError && questionError.code !== "PGRST116") {
          console.error("Question fetch error:", questionError)
          return
        }

        if (!buzzerQuestion) {
          // まだ早押しデータがない
          setBuzzerResponses([])
          return
        }

        // responsesテーブルから早押しデータを取得
        const { data: responsesData, error: responsesError } = await supabase
          .from("responses")
          .select(
            `
            id,
            participant_id,
            responded_at,
            points_awarded,
            participants (
              name
            )
          `,
          )
          .eq("question_id", buzzerQuestion.id)
          .eq("answer", "早押し")
          .order("responded_at", { ascending: true })

        if (responsesError) throw responsesError

        const formatted = (responsesData || []).map((r: any) => ({
          id: r.id,
          participant_id: r.participant_id,
          participant_name: r.participants?.name || "不明",
          responded_at: r.responded_at,
          points_awarded: r.points_awarded,
        }))

        setBuzzerResponses(formatted)
      } catch (err) {
        console.error("Error fetching buzzer responses:", err)
      }
    }

    fetchBuzzerResponses()

    // 定期的に更新
    const interval = setInterval(fetchBuzzerResponses, 3000)

    return () => clearInterval(interval)
  }, [quiz])

  // Toggle quiz active state
  const toggleQuizActive = async () => {
    if (!quiz) return

    try {
      const { error } = await supabase.from("quizzes").update({ is_active: !quiz.is_active }).eq("id", quiz.id)

      if (error) throw error

      setQuiz({ ...quiz, is_active: !quiz.is_active })

      toast({
        title: quiz.is_active ? "早押しを停止しました" : "早押しを開始しました",
        description: quiz.is_active
          ? "参加者は新しく参加できなくなります"
          : "参加者が早押しに参加できるようになりました",
      })
    } catch (err) {
      console.error("Error toggling quiz active state:", err)
      toast({
        title: "エラー",
        description: "状態の更新に失敗しました",
        variant: "destructive",
      })
    }
  }

  // Award points
  const awardPoints = async (participantId: string, responseId: string, points: number) => {
    try {
      setAwardingPoints(responseId)

      // Update response with points
      const { error: updateError } = await supabase
        .from("responses")
        .update({ points_awarded: points })
        .eq("id", responseId)

      if (updateError) throw updateError

      // Update participant score
      const participant = participants.find((p) => p.id === participantId)
      if (participant) {
        const newScore = participant.score + points
        const { error: scoreError } = await supabase
          .from("participants")
          .update({ score: newScore })
          .eq("id", participantId)

        if (scoreError) throw scoreError
      }

      toast({
        title: "ポイントを付与しました",
        description: `${points > 0 ? "+" : ""}${points}ポイント`,
      })

      // Refresh data
      setBuzzerResponses((prev) =>
        prev.map((r) => (r.id === responseId ? { ...r, points_awarded: points } : r)),
      )
    } catch (err) {
      console.error("Error awarding points:", err)
      toast({
        title: "エラー",
        description: "ポイント付与に失敗しました",
        variant: "destructive",
      })
    } finally {
      setAwardingPoints(null)
    }
  }

  // Reset buzzer
  const resetBuzzer = async () => {
    try {
      setLoading(true)

      // まず早押し専用問題を取得
      const { data: buzzerQuestion, error: questionError } = await supabase
        .from("questions")
        .select("id")
        .eq("quiz_id", quiz?.id)
        .eq("type", "quick_response")
        .eq("content", "早押し専用")
        .maybeSingle()

      if (questionError && questionError.code !== "PGRST116") {
        throw questionError
      }

      if (!buzzerQuestion) {
        // 早押しデータがない場合は何もしない
        toast({
          title: "リセット完了",
          description: "早押しデータはありません",
        })
        setLoading(false)
        return
      }

      // Delete all buzzer responses
      const { error } = await supabase
        .from("responses")
        .delete()
        .eq("question_id", buzzerQuestion.id)
        .eq("answer", "早押し")

      if (error) throw error

      setBuzzerResponses([])
      setCustomPoints({})

      toast({
        title: "早押しをリセットしました",
        description: "参加者は再度早押しできます",
      })
    } catch (err) {
      console.error("Error resetting buzzer:", err)
      toast({
        title: "エラー",
        description: "リセットに失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatResponseTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString("ja-JP", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
      })
    } catch (error) {
      return "時刻不明"
    }
  }

  if (isLoading || !user) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <p>認証を確認中...</p>
      </div>
    )
  }

  if (loading && !quiz) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "クイズが見つかりませんでした"}</p>
          <Button onClick={() => router.push("/admin/dashboard")}>ダッシュボードに戻る</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/dashboard" className="text-muted-foreground hover:text-primary transition">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="text-2xl font-bold mt-2 flex items-center space-x-2">
            <Bell className="h-6 w-6 text-primary" />
            <span>{quiz.title} - 早押しモード</span>
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="active" className={quiz.is_active ? "text-green-600" : "text-muted-foreground"}>
              {quiz.is_active ? "アクティブ" : "非アクティブ"}
            </Label>
            <Switch id="active" checked={quiz.is_active} onCheckedChange={toggleQuizActive} />
          </div>
        </div>
      </div>

      {/* Status banner */}
      {!quiz.is_active ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Pause className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="text-yellow-800 font-medium">早押しは現在停止中です</h3>
              <p className="text-yellow-700 text-sm">参加者は早押しに参加できません。スイッチをオンにして開始してください。</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="text-green-800 font-medium">早押しがアクティブです</h3>
              <p className="text-green-700 text-sm">参加者は早押しボタンを押すことができます。</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 早押し管理 */}
        <QuizCard title="早押し管理" description="参加者の早押し順序とポイント付与" gradient="yellow">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">早押し: {buzzerResponses.length}人</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={buzzerResponses.length === 0}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    リセット
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>早押しをリセットしますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      すべての早押し記録が削除されます。既に付与されたポイントは変更されません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={resetBuzzer}>リセットする</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {buzzerResponses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">まだ早押しがありません</p>
                <p className="text-sm text-muted-foreground mt-1">参加者が早押しボタンを押すとここに表示されます</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {buzzerResponses.map((response, index) => (
                  <div
                    key={response.id}
                    className={`p-4 rounded-lg border ${
                      response.points_awarded !== 0
                        ? response.points_awarded > 0
                          ? "border-green-300 bg-green-50"
                          : "border-red-300 bg-red-50"
                        : index === 0
                          ? "border-yellow-300 bg-yellow-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            response.points_awarded > 0
                              ? "bg-green-500"
                              : response.points_awarded < 0
                                ? "bg-red-500"
                                : index === 0
                                  ? "bg-yellow-500"
                                  : index === 1
                                    ? "bg-gray-500"
                                    : index === 2
                                      ? "bg-orange-500"
                                      : "bg-gray-400"
                          }`}
                        >
                          {response.points_awarded !== 0 ? (
                            response.points_awarded > 0 ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{response.participant_name}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatResponseTime(response.responded_at)}</span>
                            {response.points_awarded !== 0 && (
                              <span
                                className={`font-medium ${response.points_awarded > 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                ({response.points_awarded > 0 ? "+" : ""}
                                {response.points_awarded}点)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {response.points_awarded === 0 && (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="-100"
                            max="100"
                            value={customPoints[response.id] ?? 10}
                            onChange={(e) =>
                              setCustomPoints((prev) => ({ ...prev, [response.id]: Number(e.target.value) }))
                            }
                            className="w-20 h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              awardPoints(response.participant_id, response.id, customPoints[response.id] ?? 10)
                            }
                            disabled={awardingPoints === response.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Trophy className="h-3 w-3 mr-1" />
                            正解
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => awardPoints(response.participant_id, response.id, 0)}
                            disabled={awardingPoints === response.id}
                            className="border-red-500 text-red-500"
                          >
                            <X className="h-3 w-3 mr-1" />
                            不正解
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </QuizCard>

        {/* 共有情報 */}
        <div className="space-y-6">
          <QuizCard title="参加リンク" description="このリンクを参加者に共有" gradient="blue">
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input value={buzzerUrl} readOnly />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(buzzerUrl)
                    toast({
                      title: "コピーしました",
                      description: "早押しリンクをクリップボードにコピーしました",
                    })
                  }}
                >
                  コピー
                </Button>
              </div>
              <div className="p-2 bg-white rounded-lg border">
                <p className="text-sm font-medium mb-2">参加コード:</p>
                <div className="text-3xl font-bold tracking-widest text-center py-2">{quiz.code}</div>
              </div>
            </div>
          </QuizCard>

          <QuizCard title="QRコード" description="スキャンして参加" gradient="purple">
            {qrCode ? (
              <div className="flex flex-col items-center justify-center p-4">
                <img src={qrCode} alt="Buzzer QR Code" className="w-48 h-48 border-4 border-white rounded-lg shadow-lg" />
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    const link = document.createElement("a")
                    link.download = `buzzer-${quiz.code}-qr.png`
                    link.href = qrCode
                    link.click()
                  }}
                >
                  ダウンロード
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center p-4">
                <p className="text-muted-foreground">QRコード生成中...</p>
              </div>
            )}
          </QuizCard>

          {/* 参加者リスト（スコア順） */}
          <QuizCard title="参加者ランキング" description={`${participants.length}人参加中`} gradient="green">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {participants.slice(0, 10).map((participant, index) => (
                <div key={participant.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                            ? "bg-gray-400"
                            : index === 2
                              ? "bg-orange-600"
                              : "bg-gray-300"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="font-medium">{participant.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                    <span className="font-bold">{participant.score}点</span>
                  </div>
                </div>
              ))}
            </div>
          </QuizCard>
        </div>
      </div>
    </div>
  )
}
