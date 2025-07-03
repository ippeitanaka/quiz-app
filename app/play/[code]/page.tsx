"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Timer } from "@/components/quiz/timer"
import { CheckCircle, XCircle, Clock } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { SupabaseConfigCheck } from "@/components/supabase-config-check"

export default function PlayQuizPage({ params }: { params: { code: string } }) {
  const searchParams = useSearchParams()
  const participantId = searchParams.get("participant")

  const [quiz, setQuiz] = useState<any | null>(null)
  const [participant, setParticipant] = useState<any | null>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [visibleQuestions, setVisibleQuestions] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [hasAnswered, setHasAnswered] = useState<Record<string, boolean>>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [startTime, setStartTime] = useState<Record<string, number>>({})
  const [results, setResults] = useState<Record<string, { isCorrect: boolean; pointsAwarded: number }>>({})
  const [resultsRevealed, setResultsRevealed] = useState<Record<string, boolean>>({})

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Check if participant exists
        if (!participantId) {
          setError("参加者IDが見つかりません")
          setLoading(false)
          return
        }

        // Get participant data via API
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

        // Get quiz data via API
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

        // Get all questions for this quiz via API
        const questionsResponse = await fetch(`/api/quiz/questions?quizId=${quizData.data.id}`)
        if (!questionsResponse.ok) {
          setError("問題の読み込みに失敗しました")
          setLoading(false)
          return
        }

        const questionsData = await questionsResponse.json()
        setQuestions(questionsData.data || [])

        // Get active questions via API
        const activeQuestionsResponse = await fetch(`/api/quiz/active-questions?quizId=${quizData.data.id}`)
        const activeQuestionsData = await activeQuestionsResponse.json()

        // Filter visible questions
        if (activeQuestionsData.data && questionsData.data) {
          const activeQuestionIds = new Set(activeQuestionsData.data.map((aq: any) => aq.question_id))
          const visible = questionsData.data.filter((q: any) => activeQuestionIds.has(q.id))
          setVisibleQuestions(visible)
        } else {
          // If no active questions data, show all questions
          setVisibleQuestions(questionsData.data || [])
        }

        // Get existing responses for this participant via API
        const responsesResponse = await fetch(`/api/quiz/responses?participantId=${participantId}`)
        const responsesData = await responsesResponse.json()

        if (responsesResponse.ok && responsesData.data) {
          // Mark questions as answered
          const answeredQuestions: Record<string, boolean> = {}
          const answeredValues: Record<string, string> = {}
          const resultData: Record<string, { isCorrect: boolean; pointsAwarded: number }> = {}

          responsesData.data.forEach((response: any) => {
            answeredQuestions[response.question_id] = true
            answeredValues[response.question_id] = response.answer
            resultData[response.question_id] = {
              isCorrect: response.is_correct || false,
              pointsAwarded: response.points_awarded || 0,
            }
          })

          setHasAnswered(answeredQuestions)
          setAnswers(answeredValues)
          setResults(resultData)
        }

        // Get results revealed status for each question
        if (activeQuestionsData.data) {
          const revealedStatus: Record<string, boolean> = {}

          activeQuestionsData.data.forEach((aq: any) => {
            // results_revealedフィールドが存在するかチェック
            if (Object.prototype.hasOwnProperty.call(aq, "results_revealed")) {
              revealedStatus[aq.question_id] = aq.results_revealed || false
            } else {
              revealedStatus[aq.question_id] = false
            }
          })

          setResultsRevealed(revealedStatus)
        }

        // Initialize start time for all questions
        const times: Record<string, number> = {}
        questionsData.data?.forEach((q: any) => {
          times[q.id] = Date.now()
        })
        setStartTime(times)

        setLoading(false)
      } catch (err) {
        console.error("Error loading initial data:", err)
        setError("データの読み込み中にエラーが発生しました")
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [participantId, params.code])

  // Subscribe to results revealed changes
  useEffect(() => {
    if (!quiz) return

    const checkForUpdates = async () => {
      try {
        // active_questionsテーブルからデータを取得
        const response = await fetch(`/api/quiz/active-questions?quizId=${quiz.id}`)
        const data = await response.json()

        if (response.ok && data.data) {
          // 結果発表状態を設定
          const revealed: Record<string, boolean> = {}
          data.data.forEach((aq: any) => {
            // results_revealedフィールドが存在するかチェック
            if (Object.prototype.hasOwnProperty.call(aq, "results_revealed")) {
              revealed[aq.question_id] = aq.results_revealed || false
            } else {
              revealed[aq.question_id] = false
            }
          })
          setResultsRevealed(revealed)

          // 問題の表示/非表示が変更された場合、表示中の問題リストを更新
          if (questions.length > 0) {
            const activeQuestionIds = new Set(data.data.map((aq: any) => aq.question_id))
            const visible = questions.filter((q) => activeQuestionIds.has(q.id))
            setVisibleQuestions(visible)
          }
        }
      } catch (err) {
        console.error("Error checking for updates:", err)
      }
    }

    // 定期的に更新をチェック
    const intervalId = setInterval(checkForUpdates, 5000)

    return () => {
      clearInterval(intervalId)
    }
  }, [quiz, questions])

  // Handle submit answer
  const handleSubmitAnswer = async (questionId: string, answer: string) => {
    if (!participant || !answer.trim() || hasAnswered[questionId]) return

    try {
      setLoading(true)
      const timeTaken = Math.floor((Date.now() - (startTime[questionId] || Date.now())) / 1000)

      // Submit answer via API
      const response = await fetch("/api/quiz/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          participantId: participant.id,
          answer,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "回答の送信に失敗しました")
      }

      // Mark question as answered
      setHasAnswered((prev) => ({
        ...prev,
        [questionId]: true,
      }))

      // Save answer
      setAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }))

      // Save result
      setResults((prev) => ({
        ...prev,
        [questionId]: {
          isCorrect: data.isCorrect || false,
          pointsAwarded: data.pointsAwarded || 0,
        },
      }))

      // 参加者のスコアを更新
      if (data.pointsAwarded > 0) {
        setParticipant({
          ...participant,
          score: (participant.score || 0) + data.pointsAwarded,
        })
      }

      setLoading(false)
    } catch (err) {
      console.error("Error submitting answer:", err)
      setLoading(false)
    }
  }

  // Handle quick response
  const handleQuickResponse = async (questionId: string) => {
    if (!participant || hasAnswered[questionId]) return

    try {
      setLoading(true)
      const timeTaken = Math.floor((Date.now() - (startTime[questionId] || Date.now())) / 1000)

      // Submit quick response via API
      const response = await fetch("/api/quiz/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          participantId: participant.id,
          answer: "早押し回答",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "回答の送信に失敗しました")
      }

      // Mark question as answered
      setHasAnswered((prev) => ({
        ...prev,
        [questionId]: true,
      }))

      // Save answer
      setAnswers((prev) => ({
        ...prev,
        [questionId]: "早押し回答",
      }))

      // Save result
      setResults((prev) => ({
        ...prev,
        [questionId]: {
          isCorrect: data.isCorrect || false,
          pointsAwarded: data.pointsAwarded || 0,
        },
      }))

      // 参加者のスコアを更新
      if (data.pointsAwarded > 0) {
        setParticipant({
          ...participant,
          score: (participant.score || 0) + data.pointsAwarded,
        })
      }

      setLoading(false)
    } catch (err) {
      console.error("Error submitting quick response:", err)
      setLoading(false)
    }
  }

  // Handle time up
  const handleTimeUp = async (questionId: string) => {
    if (hasAnswered[questionId] || !participant) return

    try {
      console.log("Time up for question:", questionId)
      console.log("Participant:", participant.id)

      // Submit timeout response via API
      const response = await fetch("/api/quiz/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          participantId: participant.id,
          answer: "時間切れ",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "回答の送信に失敗しました")
      }

      const data = await response.json()

      // Mark question as answered
      setHasAnswered((prev) => ({
        ...prev,
        [questionId]: true,
      }))

      // Save answer
      setAnswers((prev) => ({
        ...prev,
        [questionId]: "時間切れ",
      }))

      // Save result
      setResults((prev) => ({
        ...prev,
        [questionId]: {
          isCorrect: false,
          pointsAwarded: 0,
        },
      }))
    } catch (err) {
      console.error("Error handling time up:", err)
      // エラーがあっても回答済みにする
      setHasAnswered((prev) => ({
        ...prev,
        [questionId]: true,
      }))
    }
  }

  // Render media content
  const renderMedia = (media: any) => {
    if (!media) return null

    switch (media.type) {
      case "image":
        return (
          <div className="mb-4 flex justify-center">
            <img
              src={media.url || "/placeholder.svg"}
              alt="Question media"
              className="max-h-64 object-contain rounded-md"
            />
          </div>
        )
      case "audio":
        return (
          <div className="mb-4 flex justify-center">
            <audio controls className="w-full max-w-md">
              <source src={media.url} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )
      case "video":
        return (
          <div className="mb-4 flex justify-center">
            <video controls className="max-h-64 w-full max-w-md object-contain rounded-md">
              <source src={media.url} />
              Your browser does not support the video element.
            </video>
          </div>
        )
      default:
        return null
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

  // Apply theme from quiz settings
  const themeStyles = {
    backgroundColor: quiz.background_url ? `url(${quiz.background_url})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }

  const currentQuestion = visibleQuestions[currentQuestionIndex] || null

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-8 px-4" style={themeStyles}>
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          {quiz.logo_url ? (
            <img src={quiz.logo_url || "/placeholder.svg"} alt="Quiz logo" className="h-10 object-contain" />
          ) : (
            <h1 className="text-xl font-bold text-primary">{quiz.title}</h1>
          )}
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium">スコア:</span>
            <span className="text-lg font-bold">{participant.score}</span>
          </div>
        </div>

        {visibleQuestions.length === 0 ? (
          <QuizCard
            title="問題がありません"
            description="管理者がまだ問題を追加していません"
            gradient={quiz.theme_color || "blue"}
          >
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <div className="text-center text-muted-foreground">
                <p>準備はいいですか？</p>
                <p>
                  名前: <span className="font-bold">{participant.name}</span>
                </p>
              </div>
            </div>
          </QuizCard>
        ) : (
          <>
            <Tabs
              defaultValue={`question-${currentQuestionIndex}`}
              onValueChange={(value) => {
                const index = Number.parseInt(value.split("-")[1])
                setCurrentQuestionIndex(index)
              }}
              className="mb-4"
            >
              <TabsList className="flex flex-wrap">
                {visibleQuestions.map((q, index) => (
                  <TabsTrigger
                    key={q.id}
                    value={`question-${index}`}
                    className={`${hasAnswered[q.id] ? "bg-green-100" : ""}`}
                  >
                    {index + 1}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {currentQuestion && (
              <QuizCard
                title={`問題 #${currentQuestionIndex + 1}`}
                description={hasAnswered[currentQuestion.id] ? "回答済み" : `${currentQuestion.points}点の問題`}
                gradient={
                  hasAnswered[currentQuestion.id] && resultsRevealed[currentQuestion.id]
                    ? results[currentQuestion.id]?.isCorrect
                      ? "green"
                      : "red"
                    : quiz.theme_color || "pink"
                }
              >
                <div className="space-y-6">
                  <div className="relative">
                    <p className="text-lg font-medium">{currentQuestion.content}</p>
                    {!hasAnswered[currentQuestion.id] && quiz.time_limit_per_question && (
                      <div className="absolute right-0 top-0">
                        <Timer
                          duration={quiz.time_limit_per_question}
                          onTimeUp={() => handleTimeUp(currentQuestion.id)}
                          isActive={!hasAnswered[currentQuestion.id]}
                          size="md"
                        />
                      </div>
                    )}
                  </div>

                  {currentQuestion.media && currentQuestion.media[0] && renderMedia(currentQuestion.media[0])}

                  {!hasAnswered[currentQuestion.id] ? (
                    <>
                      {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
                        <RadioGroup
                          value={answers[currentQuestion.id] || ""}
                          onValueChange={(value) => {
                            setAnswers((prev) => ({
                              ...prev,
                              [currentQuestion.id]: value,
                            }))
                          }}
                        >
                          <div className="space-y-3">
                            {currentQuestion.options.map((option: string, i: number) => (
                              <div
                                key={i}
                                className="flex items-center space-x-2 p-3 rounded-lg bg-muted/30 cursor-pointer"
                                onClick={() => {
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [currentQuestion.id]: option,
                                  }))
                                }}
                              >
                                <RadioGroupItem value={option} id={`option-${i}`} />
                                <Label htmlFor={`option-${i}`} className="flex-1 cursor-pointer">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      )}

                      {currentQuestion.type === "text" && (
                        <Input
                          placeholder="ここに回答を入力..."
                          value={answers[currentQuestion.id] || ""}
                          onChange={(e) => {
                            setAnswers((prev) => ({
                              ...prev,
                              [currentQuestion.id]: e.target.value,
                            }))
                          }}
                        />
                      )}

                      {currentQuestion.type === "quick_response" && (
                        <Button
                          className="w-full h-24 text-xl"
                          onClick={() => handleQuickResponse(currentQuestion.id)}
                          disabled={loading}
                        >
                          早押し！
                        </Button>
                      )}

                      {(currentQuestion.type === "multiple_choice" || currentQuestion.type === "text") && (
                        <Button
                          className="w-full"
                          onClick={() => handleSubmitAnswer(currentQuestion.id, answers[currentQuestion.id] || "")}
                          disabled={!answers[currentQuestion.id] || loading}
                        >
                          回答を送信
                        </Button>
                      )}
                    </>
                  ) : (
                    <div
                      className={`p-4 rounded-lg border text-center ${
                        resultsRevealed[currentQuestion.id]
                          ? results[currentQuestion.id]?.isCorrect
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      {resultsRevealed[currentQuestion.id] ? (
                        <>
                          <div className="flex justify-center items-center mb-2">
                            {results[currentQuestion.id]?.isCorrect ? (
                              <CheckCircle className="h-8 w-8 text-green-600 mr-2" />
                            ) : (
                              <XCircle className="h-8 w-8 text-red-600 mr-2" />
                            )}
                            <p
                              className={`font-medium ${results[currentQuestion.id]?.isCorrect ? "text-green-600" : "text-red-600"}`}
                            >
                              {results[currentQuestion.id]?.isCorrect ? "正解！" : "不正解"}
                            </p>
                          </div>
                          {results[currentQuestion.id]?.pointsAwarded > 0 && (
                            <p className="text-green-600 font-medium">
                              +{results[currentQuestion.id].pointsAwarded}点獲得！
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            あなたの回答: {answers[currentQuestion.id]}
                          </p>
                          {currentQuestion.correct_answer && (
                            <p className="text-sm font-medium mt-2">正解: {currentQuestion.correct_answer}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-center items-center mb-2">
                            <Clock className="h-8 w-8 text-blue-600 mr-2" />
                            <p className="font-medium text-blue-600">回答を受け付けました</p>
                          </div>
                          <p className="text-sm text-muted-foreground">結果発表をお待ちください</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            あなたの回答: {answers[currentQuestion.id]}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </QuizCard>
            )}

            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                前の問題
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(visibleQuestions.length - 1, prev + 1))}
                disabled={currentQuestionIndex === visibleQuestions.length - 1}
              >
                次の問題
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
