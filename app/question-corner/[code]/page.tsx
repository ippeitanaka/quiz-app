"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QuizCard } from "@/components/ui/quiz-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, Plus, Trash2, Loader2, Send } from "lucide-react"

interface QuizData {
  id: string
  title: string
  description?: string
  code: string
}

interface ParticipantData {
  id: string
  name: string
}

export default function QuestionCornerPage() {
  const params = useParams<{ code: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const code = params?.code
  const participantId = searchParams.get("participant")

  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [participant, setParticipant] = useState<ParticipantData | null>(null)
  const [questions, setQuestions] = useState<string[]>([""])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        if (!participantId) {
          setError("参加者IDが見つかりません")
          setLoading(false)
          return
        }

        const participantRes = await fetch(`/api/quiz/participants?id=${participantId}`)
        const participantJson = await participantRes.json()

        if (!participantRes.ok || !participantJson.data) {
          setError("参加者情報の取得に失敗しました")
          setLoading(false)
          return
        }

        setParticipant(participantJson.data)

        if (!code) {
          setError("クイズコードが見つかりません")
          setLoading(false)
          return
        }

        const quizRes = await fetch(`/api/quiz/check-code?code=${encodeURIComponent(code)}`)
        const quizJson = await quizRes.json()

        if (!quizRes.ok || !quizJson.success || !quizJson.data) {
          setError("クイズ情報の取得に失敗しました")
          setLoading(false)
          return
        }

        setQuiz(quizJson.data)
      } catch (err) {
        console.error("Error loading question corner:", err)
        setError("ページの読み込み中にエラーが発生しました")
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [code, participantId])

  const updateQuestion = (index: number, value: string) => {
    setQuestions((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const addQuestionField = () => {
    setQuestions((prev) => [...prev, ""])
  }

  const removeQuestionField = (index: number) => {
    setQuestions((prev) => {
      if (prev.length <= 1) {
        return prev
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    if (!quiz || !participant) return

    const normalizedQuestions = questions.map((q) => q.trim()).filter((q) => q.length > 0)

    if (normalizedQuestions.length === 0) {
      setError("質問を1つ以上入力してください")
      return
    }

    setSubmitting(true)
    setError("")
    setSuccessMessage("")

    try {
      const res = await fetch("/api/quiz/question-corner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId: quiz.id,
          participantId: participant.id,
          participantName: participant.name,
          questions: normalizedQuestions,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || "投稿に失敗しました")
      }

      setQuestions([""])
      setSuccessMessage(`${json.count ?? normalizedQuestions.length}件の質問を投稿しました`)
    } catch (err) {
      console.error("Error posting questions:", err)
      setError(err instanceof Error ? err.message : "質問の投稿に失敗しました")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex min-h-screen items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          読み込み中...
        </div>
      </div>
    )
  }

  if (error && !quiz) {
    return (
      <div className="container flex min-h-screen items-center justify-center py-12">
        <div className="w-full max-w-md">
          <QuizCard title="質問コーナー" description="ページを開けませんでした" gradient="yellow">
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push("/join")} className="w-full">
              参加画面に戻る
            </Button>
          </QuizCard>
        </div>
      </div>
    )
  }

  return (
    <div className="container flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-2xl">
        <QuizCard title="質問コーナー" description={`クイズ: ${quiz?.title ?? ""}`} gradient="yellow">
          <div className="space-y-5">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p>
                投稿者: <span className="font-semibold">{participant?.name}</span>
              </p>
              <p className="text-muted-foreground">管理者に聞きたいことを入力して送信してください。</p>
            </div>

            {questions.map((question, index) => (
              <div key={index} className="space-y-2">
                <label htmlFor={`question-${index}`} className="text-sm font-medium">
                  質問 {index + 1}
                </label>
                <div className="flex gap-2">
                  <Input
                    id={`question-${index}`}
                    value={question}
                    maxLength={200}
                    placeholder="例: 次の問題のヒントはありますか？"
                    onChange={(e) => updateQuestion(index, e.target.value)}
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeQuestionField(index)}
                    disabled={questions.length <= 1 || submitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addQuestionField} disabled={submitting} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              質問を追加
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => router.push(`/join/${code}`)} disabled={submitting}>
                戻る
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    投稿中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    質問を投稿
                  </>
                )}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <MessageSquare className="mr-1 inline h-3 w-3" />
              送信した質問は管理者の質問コーナー画面にリアルタイムで表示されます。
            </div>
          </div>
        </QuizCard>
      </div>
    </div>
  )
}
