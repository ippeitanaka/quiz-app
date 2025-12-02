"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import Link from "next/link"
import { Bell, Trophy, Award, Clock } from "lucide-react"

export default function BuzzerPage({ params }: { params: { code: string } }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const participantId = searchParams.get("participant")

  const [quiz, setQuiz] = useState<any | null>(null)
  const [participant, setParticipant] = useState<any | null>(null)
  const [hasPressed, setHasPressed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pressing, setPressing] = useState(false)
  const [responseTime, setResponseTime] = useState<string | null>(null)
  const [ranking, setRanking] = useState<any[]>([])

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // 参加者IDがない場合は参加ページにリダイレクト
        if (!participantId) {
          router.push(`/join/${params.code}`)
          return
        }

        // Get participant data
        const participantResponse = await fetch(`/api/quiz/participants?id=${participantId}`)
        if (!participantResponse.ok) {
          setError("参加者情報が見つかりません")
          setLoading(false)
          return
        }

        const participantData = await participantResponse.json()
        if (!participantData.data) {
          setError("参加者情報が見つかりません")
          setLoading(false)
          return
        }

        setParticipant(participantData.data)

        // Get quiz data
        const quizResponse = await fetch(`/api/quiz/check-code?code=${params.code}`)
        if (!quizResponse.ok) {
          setError("クイズ情報が見つかりません")
          setLoading(false)
          return
        }

        const quizData = await quizResponse.json()
        if (!quizData.data) {
          setError("クイズ情報が見つかりません")
          setLoading(false)
          return
        }

        setQuiz(quizData.data)
        setLoading(false)
      } catch (err) {
        console.error("Error loading initial data:", err)
        setError("データの読み込み中にエラーが発生しました")
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [participantId, params.code])

  // ランキングを定期的に取得
  useEffect(() => {
    if (!quiz) return

    const fetchRanking = async () => {
      try {
        const response = await fetch(`/api/quiz/participants?quizId=${quiz.id}`)
        const data = await response.json()

        if (response.ok && data.data) {
          // スコア順にソート
          const sorted = [...data.data].sort((a, b) => b.score - a.score)
          setRanking(sorted.slice(0, 10)) // トップ10のみ表示
        }
      } catch (err) {
        console.error("Error fetching ranking:", err)
      }
    }

    fetchRanking()
    const interval = setInterval(fetchRanking, 3000) // 3秒ごとに更新

    return () => clearInterval(interval)
  }, [quiz])

  // 早押しボタンを押す
  const handleBuzzerPress = async () => {
    if (!participant || hasPressed || pressing) return

    try {
      setPressing(true)
      const pressTime = new Date().toISOString()

      // 早押しAPIを呼び出す（簡易版: responsesテーブルに記録）
      const response = await fetch("/api/buzzer/press", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: participant.id,
          quizId: quiz.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "早押しの送信に失敗しました")
      }

      setHasPressed(true)
      setResponseTime(pressTime)
    } catch (err) {
      console.error("Error pressing buzzer:", err)
      alert(err instanceof Error ? err.message : "早押しに失敗しました")
      setPressing(false)
    } finally {
      setPressing(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (error || !quiz || !participant) {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-red-500 mb-4">{error || "エラーが発生しました"}</p>
        <Link href="/">
          <Button>ホームに戻る</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-8 px-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground">早押しモード</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">参加者</p>
            <p className="text-lg font-bold">{participant.name}</p>
            <div className="flex items-center justify-end space-x-1 mt-1">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="text-lg font-bold text-yellow-600">{participant.score}点</span>
            </div>
          </div>
        </div>

        {/* 早押しボタン */}
        <QuizCard
          title="早押しボタン"
          description={hasPressed ? "押しました！" : "準備ができたら押してください"}
          gradient={hasPressed ? "green" : "pink"}
        >
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            {!hasPressed ? (
              <Button
                onClick={handleBuzzerPress}
                disabled={pressing}
                className="w-64 h-64 rounded-full text-4xl font-bold shadow-2xl hover:scale-105 transition-all duration-200 bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
              >
                {pressing ? (
                  <span className="animate-pulse">送信中...</span>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <Bell className="h-20 w-20" />
                    <span>早押し！</span>
                  </div>
                )}
              </Button>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-64 h-64 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-2xl">
                  <Award className="h-20 w-20 mb-4" />
                  <p className="text-2xl font-bold">押しました！</p>
                  {responseTime && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Clock className="h-5 w-5" />
                      <p className="text-sm">
                        {new Date(responseTime).toLocaleTimeString("ja-JP", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          fractionalSecondDigits: 3,
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">管理者の判定をお待ちください</p>
              </div>
            )}
          </div>
        </QuizCard>

        {/* ランキング */}
        {ranking.length > 0 && (
          <QuizCard title="現在のランキング" description="トップ10" gradient="blue">
            <div className="space-y-2">
              {ranking.map((p, index) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    p.id === participant.id ? "bg-primary/10 border-2 border-primary" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
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
                    <div>
                      <p className={`font-medium ${p.id === participant.id ? "text-primary" : ""}`}>
                        {p.name}
                        {p.id === participant.id && (
                          <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded">あなた</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                    <span className="font-bold">{p.score}点</span>
                  </div>
                </div>
              ))}
            </div>
          </QuizCard>
        )}
      </div>
    </div>
  )
}
