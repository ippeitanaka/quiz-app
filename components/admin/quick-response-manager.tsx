"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Trophy, RotateCcw, Clock, User, RefreshCw, CheckCircle, X, AlertCircle } from "lucide-react"
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

interface QuickResponseOrder {
  id: string
  participant_id: string
  participant_name: string
  responded_at: string
  points_awarded: number
  is_correct: boolean
}

interface QuickResponseManagerProps {
  questionId: string
  questionPoints: number
  onUpdate?: () => void
}

export function QuickResponseManager({ questionId, questionPoints, onUpdate }: QuickResponseManagerProps) {
  const [responses, setResponses] = useState<QuickResponseOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [awardingPoints, setAwardingPoints] = useState<string | null>(null)
  const [customPoints, setCustomPoints] = useState<Record<string, number>>({})
  const [retryCount, setRetryCount] = useState(0)
  const [isPolling, setIsPolling] = useState(true)

  // 早押し順序を取得
  const fetchQuickResponses = useCallback(
    async (showLoadingState = true) => {
      try {
        if (showLoadingState) {
          setLoading(true)
        }

        console.log("Fetching quick responses for question:", questionId)

        const response = await fetch(`/api/quiz/quick-response-order?questionId=${questionId}`)
        const data = await response.json()

        console.log("API response:", { status: response.status, data })

        if (response.ok) {
          setResponses(data.data || [])
          setError(null)
          setRetryCount(0)
          console.log("Successfully loaded responses:", data.data?.length || 0)
        } else {
          // 404やデータなしの場合は空配列として扱う
          if (response.status === 404 || data.data === null) {
            setResponses([])
            setError(null)
          } else {
            const errorMessage = data.error || "早押し順序の取得に失敗しました"
            console.error("API error:", errorMessage)
            setError(errorMessage)
            setRetryCount((prev) => prev + 1)

            // 初回エラーのみトーストを表示
            if (retryCount === 0) {
              toast({
                title: "エラー",
                description: errorMessage,
                variant: "destructive",
              })
            }
          }
        }
      } catch (error) {
        console.error("Network error fetching quick responses:", error)
        const errorMessage = "ネットワークエラーが発生しました"
        setError(errorMessage)
        setRetryCount((prev) => prev + 1)

        // 初回エラーのみトーストを表示
        if (retryCount === 0) {
          toast({
            title: "エラー",
            description: errorMessage,
            variant: "destructive",
          })
        }
      } finally {
        if (showLoadingState) {
          setLoading(false)
        }
      }
    },
    [questionId, retryCount],
  )

  // 初回読み込み
  useEffect(() => {
    if (questionId) {
      setRetryCount(0)
      fetchQuickResponses(true)
    }
  }, [questionId])

  // 定期的な更新（エラーが続く場合は停止）
  useEffect(() => {
    if (!questionId || !isPolling) return

    // 連続してエラーが発生した場合はポーリングを停止
    if (retryCount >= 3) {
      console.log("Too many errors, stopping polling")
      setIsPolling(false)
      return
    }

    const interval = setInterval(() => {
      fetchQuickResponses(false) // バックグラウンド更新はローディング表示しない
    }, 5000) // 5秒ごとに更新（頻度を下げる）

    return () => clearInterval(interval)
  }, [questionId, isPolling, retryCount, fetchQuickResponses])

  // ポイントを付与
  const awardPoints = async (participantId: string, points: number) => {
    try {
      setAwardingPoints(participantId)

      console.log("Awarding points:", { participantId, questionId, points })

      const response = await fetch("/api/quiz/award-quick-response-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId,
          questionId,
          points,
        }),
      })

      const data = await response.json()
      console.log("Award points response:", data)

      if (response.ok) {
        const pointsText = points > 0 ? `+${points}` : points === 0 ? "0" : `${points}`
        toast({
          title: "ポイントを付与しました",
          description: `${pointsText}ポイントが付与されました`,
        })

        // 即座に更新
        await fetchQuickResponses(false)
        onUpdate?.()
      } else {
        throw new Error(data.error || "ポイント付与に失敗しました")
      }
    } catch (error) {
      console.error("Error awarding points:", error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ポイント付与に失敗しました",
        variant: "destructive",
      })
    } finally {
      setAwardingPoints(null)
    }
  }

  // 早押しをリセット
  const resetQuickResponses = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/quiz/quick-response-order?questionId=${questionId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "早押しをリセットしました",
          description: "参加者は再度早押しできるようになりました",
        })
        setResponses([])
        setCustomPoints({})
        setError(null)
        setRetryCount(0)
        setIsPolling(true) // ポーリングを再開
        onUpdate?.()
      } else {
        throw new Error(data.error || "リセットに失敗しました")
      }
    } catch (error) {
      console.error("Error resetting quick responses:", error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "リセットに失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 手動更新（エラー時の再試行）
  const handleManualRefresh = () => {
    setError(null)
    setRetryCount(0)
    setIsPolling(true)
    fetchQuickResponses(true)
  }

  // カスタムポイントの値を更新
  const updateCustomPoints = (participantId: string, points: number) => {
    setCustomPoints((prev) => ({
      ...prev,
      [participantId]: points,
    }))
  }

  // 回答時間を表示用にフォーマット
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
      console.error("Error formatting time:", error)
      return "時刻不明"
    }
  }

  return (
    <QuizCard title="早押し管理" description="参加者の早押し順序とポイント付与" gradient="yellow">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">回答者: {responses.length}人</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              更新
            </Button>
            {!isPolling && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">自動更新停止中</span>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={responses.length === 0}>
                <RotateCcw className="h-4 w-4 mr-1" />
                リセット
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>早押しをリセットしますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  すべての早押し回答が削除され、参加者は再度早押しできるようになります。
                  既に付与されたポイントは変更されません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={resetQuickResponses}>リセットする</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {error && retryCount >= 3 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">接続エラー</p>
                <p className="text-red-700 text-sm">早押し情報の取得に失敗しました。自動更新を停止しています。</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleManualRefresh}>
                再試行
              </Button>
            </div>
          </div>
        )}

        {loading && responses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : responses.length === 0 && !error ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">まだ早押し回答がありません</p>
            <p className="text-sm text-muted-foreground mt-1">参加者が早押しボタンを押すとここに表示されます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {responses.map((response, index) => (
              <div
                key={response.id}
                className={`p-4 rounded-lg border ${
                  response.points_awarded !== 0
                    ? response.points_awarded > 0
                      ? "border-green-300 bg-green-50"
                      : "border-red-300 bg-red-50"
                    : index === 0
                      ? "border-yellow-300 bg-yellow-50"
                      : index === 1
                        ? "border-gray-300 bg-gray-50"
                        : index === 2
                          ? "border-orange-300 bg-orange-50"
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
                      {response.points_awarded > 0 ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : response.points_awarded < 0 ? (
                        <X className="h-4 w-4" />
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
                            {response.points_awarded}ポイント付与済み)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {response.points_awarded === 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <Label htmlFor={`points-${response.id}`} className="text-xs">
                          ポイント:
                        </Label>
                        <Input
                          id={`points-${response.id}`}
                          type="number"
                          min="-100"
                          max="100"
                          value={customPoints[response.participant_id] ?? questionPoints}
                          onChange={(e) => updateCustomPoints(response.participant_id, Number(e.target.value))}
                          className="w-20 h-8 text-xs"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          awardPoints(response.participant_id, customPoints[response.participant_id] ?? questionPoints)
                        }
                        disabled={awardingPoints === response.participant_id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {awardingPoints === response.participant_id ? (
                          "付与中..."
                        ) : (
                          <>
                            <Trophy className="h-3 w-3 mr-1" />
                            正解
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => awardPoints(response.participant_id, 0)}
                        disabled={awardingPoints === response.participant_id}
                        className="border-red-500 text-red-500 hover:bg-red-50"
                      >
                        {awardingPoints === response.participant_id ? (
                          "処理中..."
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            不正解
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {responses.length > 0 && !error && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>使い方:</strong>{" "}
              早押し順に参加者が表示されています。管理者が選択した参加者に「正解」または「不正解」ボタンでポイントを付与してください。
              ポイント欄で任意のポイント数を設定できます（マイナスポイントも可能）。
            </p>
          </div>
        )}

        {responses.some((r) => r.points_awarded !== 0) && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>ポイント付与完了:</strong>{" "}
              ポイントが付与された参加者は緑色（正解）または赤色（不正解）で表示されています。
            </p>
          </div>
        )}
      </div>
    </QuizCard>
  )
}
