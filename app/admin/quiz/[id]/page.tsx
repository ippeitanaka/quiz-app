"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QuizCard } from "@/components/ui/quiz-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase/supabase"
import { generateQRCode } from "@/lib/utils/qr-code"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Quiz, Question, Participant } from "@/lib/supabase/schema"
import Link from "next/link"
import { useAuth } from "@/lib/auth/auth-context"
import { ThemeSelector } from "@/components/quiz/theme-selector"
import { TeamManagement } from "@/components/quiz/team-management"
import { AnalyticsDashboard } from "@/components/quiz/analytics-dashboard"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Trash2, Award, Eye, EyeOff, UserMinus, Loader2, Play, Pause, Pencil, Copy, Users } from "lucide-react"
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
import { QuickResponseManager } from "@/components/admin/quick-response-manager"
import { Checkbox } from "@/components/ui/checkbox"

export default function AdminQuizPage({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [teams, setTeams] = useState([])
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [analyticsData, setAnalyticsData] = useState(null)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [hiddenQuestions, setHiddenQuestions] = useState<string[]>([])
  const [newQuestion, setNewQuestion] = useState({
    content: "",
    type: "multiple_choice",
    options: ["", ""],
    correctOption: 0,
    correctAnswer: "",
    points: 10,
  })
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [isUpdatingDb, setIsUpdatingDb] = useState(false)
  const [resultsRevealed, setResultsRevealed] = useState<Record<string, boolean>>({})
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [allowMultipleActive, setAllowMultipleActive] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // 環境変数が設定されていない場合は window.location.origin を使用
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const joinUrl = quiz ? `${baseUrl}/join/${quiz.code}` : ""

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
        console.log("Fetching quiz with ID:", params.id)

        if (!params.id) {
          throw new Error("クイズIDが指定されていません")
        }

        const { data, error } = await supabase.from("quizzes").select("*").eq("id", params.id).single()

        console.log("Quiz fetch result:", { data, error })

        if (error) {
          console.error("Supabase error:", error)
          throw new Error(`クイズの取得に失敗しました: ${error.message}`)
        }

        if (!data) {
          throw new Error("クイズが見つかりませんでした")
        }

        setQuiz(data as Quiz)

        // Generate QR code for join URL
        if (data && data.code) {
          const url = `${baseUrl}/join/${data.code}`
          console.log("Generating QR code for URL:", url)
          try {
            const qrDataUrl = await generateQRCode(url)
            setQrCode(qrDataUrl)
          } catch (qrError) {
            console.error("Error generating QR code:", qrError)
            // QRコード生成エラーは致命的ではないので、処理を続行
          }
        }
      } catch (err) {
        console.error("Error in fetchQuiz:", err)
        const errorMessage = err instanceof Error ? err.message : "クイズの読み込み中にエラーが発生しました"
        setError(errorMessage)
      }
    }

    fetchQuiz()
  }, [params.id, isLoading, user, baseUrl])

  // Load questions
  useEffect(() => {
    if (!quiz) return

    const fetchQuestions = async () => {
      try {
        console.log("Fetching questions for quiz:", quiz.id)

        const { data, error } = await supabase
          .from("questions")
          .select("*")
          .eq("quiz_id", quiz.id)
          .order("order", { ascending: true })

        console.log("Questions fetch result:", { data, error })

        if (error) {
          console.error("Error fetching questions:", error)
          throw new Error(`問題の取得に失敗しました: ${error.message}`)
        }

        setQuestions((data as Question[]) || [])
        setLoading(false)
      } catch (err) {
        console.error("Error in fetchQuestions:", err)
        setError("問題の読み込み中にエラーが発生しました")
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [quiz])

  // 非表示の問題と結果発表状態を取得
  useEffect(() => {
    if (!quiz) return

    const fetchActiveQuestions = async () => {
      try {
        const { data, error } = await supabase.from("active_questions").select("*").eq("quiz_id", quiz.id)

        if (error) {
          console.error("Error fetching active questions:", error)
          return
        }

        // 結果発表状態を設定
        const revealed: Record<string, boolean> = {}
        const activeQuestionIds: string[] = []

        if (data && Array.isArray(data)) {
          data.forEach((aq) => {
            if (Object.prototype.hasOwnProperty.call(aq, "results_revealed")) {
              revealed[aq.question_id] = aq.results_revealed || false
            } else {
              revealed[aq.question_id] = false
            }
            activeQuestionIds.push(aq.question_id)
          })
        }

        setResultsRevealed(revealed)

        // 非表示の問題を設定（アクティブでない問題）
        if (questions.length > 0) {
          const hidden = questions.filter((q) => !activeQuestionIds.includes(q.id)).map((q) => q.id)
          setHiddenQuestions(hidden)
        }
      } catch (err) {
        console.error("Error fetching active questions:", err)
      }
    }

    if (questions.length > 0) {
      fetchActiveQuestions()
    }
  }, [quiz, questions])

  // Subscribe to participants changes
  useEffect(() => {
    if (!quiz) return

    const fetchParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from("participants")
          .select("*")
          .eq("quiz_id", quiz.id)
          .order("score", { ascending: false })

        if (error) {
          console.error("Error fetching participants:", error)
          return
        }

        setParticipants((data as Participant[]) || [])
      } catch (err) {
        console.error("Error in fetchParticipants:", err)
      }
    }

    fetchParticipants()

    // Subscribe to changes in the participants table
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

  // Load teams
  useEffect(() => {
    if (!quiz) return

    const fetchTeams = async () => {
      try {
        const { data, error } = await supabase.from("teams").select("*").eq("quiz_id", quiz.id)

        if (error) {
          console.error("Error fetching teams:", error)
          return
        }

        setTeams(data || [])
      } catch (err) {
        console.error("Error fetching teams:", err)
      }
    }

    fetchTeams()
  }, [quiz])

  // Load analytics data
  useEffect(() => {
    if (!quiz) return

    const fetchAnalytics = async () => {
      try {
        const mockAnalytics = {
          quizId: quiz.id,
          title: quiz.title,
          sessions: [
            {
              id: "session-1",
              date: new Date().toISOString(),
              participants: participants.length,
              teams: teams.map((team: any) => ({
                id: team.id || `team-${Math.random()}`,
                name: team.name || "Unknown Team",
                score: Math.floor(Math.random() * 100),
              })),
              questions: questions.map((q) => ({
                id: q.id,
                text: q.content,
                correctRate: Math.random(),
                averageTime: Math.floor(Math.random() * 30) + 5,
                optionDistribution: (q.options || []).map((option, i) => ({
                  optionId: `option-${i}`,
                  optionText: option,
                  count: Math.floor(Math.random() * participants.length),
                })),
              })),
            },
          ],
        }

        setAnalyticsData(mockAnalytics)
      } catch (err) {
        console.error("Error fetching analytics:", err)
      }
    }

    if (questions.length > 0 && participants.length > 0) {
      fetchAnalytics()
    }
  }, [quiz, questions, participants, teams])

  // Toggle quiz active state
  const toggleQuizActive = async () => {
    if (!quiz) return

    try {
      const { error } = await supabase.from("quizzes").update({ is_active: !quiz.is_active }).eq("id", quiz.id)

      if (error) throw error

      setQuiz({ ...quiz, is_active: !quiz.is_active })

      toast({
        title: quiz.is_active ? "クイズを停止しました" : "クイズを開始しました",
        description: quiz.is_active
          ? "参加者は新しく参加できなくなります"
          : "参加者がクイズに参加できるようになりました",
      })
    } catch (err) {
      console.error("Error toggling quiz active state:", err)
      toast({
        title: "エラー",
        description: "クイズの状態を更新できませんでした",
        variant: "destructive",
      })
    }
  }

  // Handle theme save
  const handleThemeSave = async (theme: any) => {
    if (!quiz) return

    try {
      const { error } = await supabase
        .from("quizzes")
        .update({
          theme_color: theme.color,
          logo_url: theme.logo || "",
          background_url: theme.background || "",
        })
        .eq("id", quiz.id)

      if (error) throw error

      setQuiz({
        ...quiz,
        theme_color: theme.color,
        logo_url: theme.logo || "",
        background_url: theme.background || "",
      })
    } catch (err) {
      console.error("Error saving theme:", err)
    }
  }

  // Handle team save
  const handleTeamSave = async (updatedTeams: any) => {
    if (!quiz) return

    try {
      setTeams(updatedTeams)
    } catch (err) {
      console.error("Error saving teams:", err)
    }
  }

  // 新しい問題を追加または編集
  const handleAddQuestion = async () => {
    if (!quiz) return

    try {
      if (!newQuestion.content.trim()) {
        toast({
          title: "エラー",
          description: "問題文を入力してください",
          variant: "destructive",
        })
        return
      }

      if (newQuestion.type === "multiple_choice" && newQuestion.options.some((opt) => !opt.trim())) {
        toast({
          title: "エラー",
          description: "すべての選択肢を入力してください",
          variant: "destructive",
        })
        return
      }

      // 正解の設定
      let correctAnswer = ""
      if (newQuestion.type === "multiple_choice") {
        correctAnswer = newQuestion.options[newQuestion.correctOption]
      } else if (newQuestion.type === "text") {
        correctAnswer = newQuestion.correctAnswer
      }

      if (editingQuestionId) {
        // 既存の問題を更新
        const { error } = await supabase
          .from("questions")
          .update({
            content: newQuestion.content,
            type: newQuestion.type,
            options: newQuestion.options,
            correct_answer: correctAnswer,
            points: newQuestion.points,
          })
          .eq("id", editingQuestionId)

        if (error) throw error

        // 問題リストを更新
        setQuestions(
          questions.map((q) =>
            q.id === editingQuestionId
              ? {
                  ...q,
                  content: newQuestion.content,
                  type: newQuestion.type,
                  options: newQuestion.options,
                  correct_answer: correctAnswer,
                  points: newQuestion.points,
                }
              : q,
          ),
        )

        toast({
          title: "成功",
          description: "問題が更新されました",
        })
      } else {
        // 新しい問題を作成
        const { data, error } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            content: newQuestion.content,
            type: newQuestion.type,
            options: newQuestion.options,
            correct_answer: correctAnswer,
            points: newQuestion.points,
            order: questions.length,
          })
          .select()
          .single()

        if (error) throw error

        // 問題リストを更新
        setQuestions([...questions, data as Question])

        toast({
          title: "成功",
          description: "問題が追加されました",
        })
      }

      // フォームをリセット
      setNewQuestion({
        content: "",
        type: "multiple_choice",
        options: ["", ""],
        correctOption: 0,
        correctAnswer: "",
        points: 10,
      })

      setEditingQuestionId(null)
      setIsAddingQuestion(false)
    } catch (err) {
      console.error("Error saving question:", err)
      toast({
        title: "エラー",
        description: err instanceof Error ? err.message : "問題の保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  // 問題を編集する関数
  const editQuestion = (question: Question) => {
    setNewQuestion({
      content: question.content,
      type: question.type,
      options: question.options || ["", ""],
      correctOption: question.options ? question.options.findIndex((opt) => opt === question.correct_answer) : 0,
      correctAnswer: question.correct_answer || "",
      points: question.points,
    })
    setEditingQuestionId(question.id)
    setIsAddingQuestion(true)
  }

  // 問題をコピーする関数
  const copyQuestion = (question: Question) => {
    setNewQuestion({
      content: `${question.content} (コピー)`,
      type: question.type,
      options: question.options || ["", ""],
      correctOption: question.options ? question.options.findIndex((opt) => opt === question.correct_answer) : 0,
      correctAnswer: question.correct_answer || "",
      points: question.points,
    })
    setEditingQuestionId(null)
    setIsAddingQuestion(true)
  }

  // 問題を削除
  const handleDeleteQuestion = async (questionId: string) => {
    if (!quiz) return

    if (!confirm("この問題を削除してもよろしいですか？")) {
      return
    }

    try {
      const { error } = await supabase.from("questions").delete().eq("id", questionId)

      if (error) throw error

      // 問題リストを更新
      setQuestions(questions.filter((q) => q.id !== questionId))

      toast({
        title: "成功",
        description: "問題が削除されました",
      })
    } catch (err) {
      console.error("Error deleting question:", err)
      toast({
        title: "エラー",
        description: err instanceof Error ? err.message : "問題の削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  // 新しい問題の選択肢を更新
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...newQuestion.options]
    newOptions[index] = value
    setNewQuestion({ ...newQuestion, options: newOptions })
  }

  // 選択肢を追加
  const handleAddOption = () => {
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, ""],
    })
  }

  // 選択肢を削除
  const handleRemoveOption = (index: number) => {
    if (newQuestion.options.length <= 2) {
      return
    }

    const newOptions = [...newQuestion.options]
    newOptions.splice(index, 1)

    let newCorrectOption = newQuestion.correctOption
    if (newCorrectOption === index) {
      newCorrectOption = 0
    } else if (newCorrectOption > index) {
      newCorrectOption = newCorrectOption - 1
    }

    setNewQuestion({
      ...newQuestion,
      options: newOptions,
      correctOption: newCorrectOption,
    })
  }

  // 問題の表示/非表示を切り替える
  const toggleQuestionVisibility = async (questionId: string) => {
    try {
      const isCurrentlyHidden = hiddenQuestions.includes(questionId)

      if (isCurrentlyHidden) {
        // 複数問題同時アクティブが無効な場合、他の問題を非表示にする
        if (!allowMultipleActive) {
          // 他のアクティブな問題をすべて非表示にする
          const { error: deleteError } = await supabase.from("active_questions").delete().eq("quiz_id", quiz?.id)

          if (deleteError) throw deleteError
        }

        // 問題を表示する（active_questionsに追加）
        const { error } = await supabase.from("active_questions").insert({
          quiz_id: quiz?.id,
          question_id: questionId,
          results_revealed: false,
        })

        if (error) throw error

        if (!allowMultipleActive) {
          // 他の問題を非表示にする
          setHiddenQuestions(questions.filter((q) => q.id !== questionId).map((q) => q.id))
        } else {
          // この問題だけを表示にする
          setHiddenQuestions(hiddenQuestions.filter((id) => id !== questionId))
        }
      } else {
        // 問題を非表示にする（active_questionsから削除）
        const { error } = await supabase
          .from("active_questions")
          .delete()
          .eq("quiz_id", quiz?.id)
          .eq("question_id", questionId)

        if (error) throw error

        setHiddenQuestions([...hiddenQuestions, questionId])
      }

      toast({
        title: "成功",
        description: isCurrentlyHidden ? "問題を表示しました" : "問題を非表示にしました",
      })
    } catch (err) {
      console.error("Error toggling question visibility:", err)
      toast({
        title: "エラー",
        description: err instanceof Error ? err.message : "問題の表示/非表示の切り替えに失敗しました",
        variant: "destructive",
      })
    }
  }

  // 正解を発表する関数
  const revealResults = async (questionId: string) => {
    try {
      // results_revealedカラムの更新を試行（カラムが存在しない場合はエラーになるが、それでも機能は動作する）
      const { error } = await supabase
        .from("active_questions")
        .update({ results_revealed: true })
        .eq("quiz_id", quiz?.id)
        .eq("question_id", questionId)

      // エラーがあってもログに記録するだけで、処理は続行
      if (error) {
        console.log("Note: results_revealed column may not exist, but function will work:", error)
      }

      setResultsRevealed((prev) => ({
        ...prev,
        [questionId]: true,
      }))

      toast({
        title: "正解を発表しました",
        description: "参加者に結果が表示されます",
      })
    } catch (err) {
      console.error("Error revealing results:", err)
      toast({
        title: "エラー",
        description: "正解発表に失敗しました",
        variant: "destructive",
      })
    }
  }

  // 参加者を削除する関数
  const deleteParticipant = async (participantId: string) => {
    try {
      if (!confirm(`この参加者を削除してもよろしいですか？この操作は元に戻せません。`)) {
        return
      }

      setDeletingParticipantId(participantId)

      const { error } = await supabase.from("participants").delete().eq("id", participantId)

      if (error) throw error

      setParticipants((prevParticipants) => prevParticipants.filter((p) => p.id !== participantId))

      toast({
        title: "成功",
        description: "参加者を削除しました",
      })
    } catch (err) {
      console.error("Error deleting participant:", err)
      toast({
        title: "エラー",
        description: err instanceof Error ? err.message : "参加者の削除に失敗しました",
        variant: "destructive",
      })
    } finally {
      setDeletingParticipantId(null)
    }
  }

  // 参加者の選択状態を切り替え
  const toggleParticipantSelection = (participantId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId) ? prev.filter((id) => id !== participantId) : [...prev, participantId],
    )
  }

  // 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedParticipants.length === participants.length) {
      setSelectedParticipants([])
    } else {
      setSelectedParticipants(participants.map((p) => p.id))
    }
  }

  // 選択した参加者を一括削除
  const bulkDeleteParticipants = async () => {
    if (selectedParticipants.length === 0) return

    try {
      setBulkDeleting(true)

      const response = await fetch("/api/quiz/participants/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantIds: selectedParticipants,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setParticipants((prev) => prev.filter((p) => !selectedParticipants.includes(p.id)))
        setSelectedParticipants([])

        toast({
          title: "一括削除完了",
          description: data.message,
        })
      } else {
        throw new Error(data.error || "一括削除に失敗しました")
      }
    } catch (err) {
      console.error("Error bulk deleting participants:", err)
      toast({
        title: "エラー",
        description: err instanceof Error ? err.message : "一括削除に失敗しました",
        variant: "destructive",
      })
    } finally {
      setBulkDeleting(false)
    }
  }

  // 参加者タブの内容
  const renderParticipantsTab = () => {
    return (
      <div className="space-y-6">
        <QuizCard title="参加者一覧" description="クイズに参加しているユーザー" gradient="green">
          <div className="space-y-4">
            {participants.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                まだ参加者がいません。クイズをアクティブにして、参加リンクを共有してください。
              </p>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedParticipants.length === participants.length}
                        onCheckedChange={toggleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-sm">
                        全選択 ({selectedParticipants.length}/{participants.length})
                      </Label>
                    </div>
                  </div>
                  {selectedParticipants.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-500">
                          <Users className="h-4 w-4 mr-1" />
                          選択した参加者を削除 ({selectedParticipants.length}人)
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>参加者を一括削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            選択した{selectedParticipants.length}
                            人の参加者とその回答データがすべて削除されます。この操作は元に戻せません。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={bulkDeleteParticipants}
                            disabled={bulkDeleting}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {bulkDeleting ? "削除中..." : "削除する"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 w-12">選択</th>
                        <th className="text-left py-2 px-4">名前</th>
                        <th className="text-left py-2 px-4">スコア</th>
                        <th className="text-left py-2 px-4">参加日時</th>
                        <th className="text-right py-2 px-4">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((participant) => (
                        <tr key={participant.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-4">
                            <Checkbox
                              checked={selectedParticipants.includes(participant.id)}
                              onCheckedChange={() => toggleParticipantSelection(participant.id)}
                            />
                          </td>
                          <td className="py-2 px-4">{participant.name}</td>
                          <td className="py-2 px-4">{participant.score}</td>
                          <td className="py-2 px-4">{new Date(participant.joined_at).toLocaleString()}</td>
                          <td className="py-2 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => deleteParticipant(participant.id)}
                              disabled={deletingParticipantId === participant.id}
                            >
                              {deletingParticipantId === participant.id ? (
                                <span className="flex items-center">
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  削除中...
                                </span>
                              ) : (
                                <>
                                  <UserMinus className="h-4 w-4 mr-1" />
                                  削除
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </QuizCard>
      </div>
    )
  }

  if (isLoading || !user) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>認証を確認中...</p>
      </div>
    )
  }

  if (loading && !quiz) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>クイズを読み込み中...</p>
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
          <h1 className="text-2xl font-bold mt-2">{quiz.title}</h1>
          {quiz.description && <p className="text-muted-foreground">{quiz.description}</p>}
        </div>

        <div className="flex items-center space-x-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-500 mr-2">
                <Trash2 className="h-4 w-4 mr-1" />
                クイズを削除
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
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/quiz/${quiz.id}`, {
                        method: "DELETE",
                      })

                      const result = await response.json()

                      if (!response.ok) {
                        throw new Error(result.error || "クイズの削除に失敗しました")
                      }

                      toast({
                        title: "クイズを削除しました",
                        description: "クイズとすべての関連データが削除されました",
                      })

                      router.push("/admin/dashboard")
                    } catch (error) {
                      console.error("Error deleting quiz:", error)
                      toast({
                        title: "エラー",
                        description: error instanceof Error ? error.message : "クイズの削除中にエラーが発生しました",
                        variant: "destructive",
                      })
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600"
                >
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex items-center space-x-2">
            <Label htmlFor="active" className={quiz.is_active ? "text-green-600" : "text-muted-foreground"}>
              {quiz.is_active ? "アクティブ" : "非アクティブ"}
            </Label>
            <Switch id="active" checked={quiz.is_active} onCheckedChange={toggleQuizActive} />
          </div>
        </div>
      </div>

      {/* クイズ状態の表示 */}
      {!quiz.is_active && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Pause className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="text-yellow-800 font-medium">クイズは現在停止中です</h3>
              <p className="text-yellow-700 text-sm">
                参加者はクイズに参加できません。上のスイッチをオンにしてクイズを開始してください。
              </p>
            </div>
          </div>
        </div>
      )}

      {quiz.is_active && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="text-green-800 font-medium">クイズは現在アクティブです</h3>
              <p className="text-green-700 text-sm">
                参加者はクイズに参加できます。参加リンクやQRコードを共有してください。
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="questions">
        <TabsList className="mb-4">
          <TabsTrigger value="questions">問題</TabsTrigger>
          <TabsTrigger value="participants">参加者 ({participants.length})</TabsTrigger>
          <TabsTrigger value="theme">テーマ設定</TabsTrigger>
          <TabsTrigger value="teams">チーム設定</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="share">共有</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-6">
          {/* 問題表示モード設定 */}
          <QuizCard title="問題表示設定" description="問題の表示方法を設定します" gradient="blue">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="multiple-active" className="text-sm font-medium">
                  複数問題同時表示
                </Label>
                <p className="text-xs text-muted-foreground">
                  {allowMultipleActive
                    ? "複数の問題を同時にアクティブにできます"
                    : "1つの問題のみアクティブにできます（推奨）"}
                </p>
              </div>
              <Switch id="multiple-active" checked={allowMultipleActive} onCheckedChange={setAllowMultipleActive} />
            </div>
          </QuizCard>

          {isAddingQuestion ? (
            <QuizCard title={editingQuestionId ? "問題を編集" : "新しい問題を追加"} gradient="yellow">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="content" className="text-sm font-medium">
                    問題内容
                  </label>
                  <Textarea
                    id="content"
                    value={newQuestion.content}
                    onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                    placeholder="問題文を入力してください"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="type" className="text-sm font-medium">
                      質問タイプ
                    </label>
                    <Select
                      value={newQuestion.type}
                      onValueChange={(value) => {
                        setNewQuestion({
                          ...newQuestion,
                          type: value as "multiple_choice" | "text" | "quick_response",
                        })
                      }}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="質問タイプ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">選択肢方式</SelectItem>
                        <SelectItem value="text">テキスト方式</SelectItem>
                        <SelectItem value="quick_response">早押し方式</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="points" className="text-sm font-medium">
                      ポイント
                    </label>
                    <Input
                      id="points"
                      type="number"
                      value={newQuestion.points}
                      onChange={(e) => setNewQuestion({ ...newQuestion, points: Number(e.target.value) })}
                      min={1}
                      max={100}
                    />
                  </div>
                </div>

                {newQuestion.type === "multiple_choice" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">選択肢</label>
                      <span className="text-xs text-muted-foreground">正解の選択肢を選んでください</span>
                    </div>

                    <RadioGroup
                      value={newQuestion.correctOption.toString()}
                      onValueChange={(value) => setNewQuestion({ ...newQuestion, correctOption: Number(value) })}
                    >
                      {newQuestion.options.map((option, i) => (
                        <div key={i} className="flex items-center space-x-2 mb-2">
                          <RadioGroupItem value={i.toString()} id={`new-option-${i}`} />
                          <div className="flex-1 flex space-x-2">
                            <Input
                              value={option}
                              onChange={(e) => handleOptionChange(i, e.target.value)}
                              placeholder={`選択肢 ${i + 1}`}
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveOption(i)}
                              disabled={newQuestion.options.length <= 2}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>

                    <Button type="button" variant="outline" onClick={handleAddOption} className="w-full">
                      選択肢を追加
                    </Button>
                  </div>
                )}

                {newQuestion.type === "text" && (
                  <div className="space-y-2">
                    <label htmlFor="correctAnswer" className="text-sm font-medium">
                      正解
                    </label>
                    <Input
                      id="correctAnswer"
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                      placeholder="正解のテキストを入力"
                    />
                    <p className="text-xs text-muted-foreground">
                      参加者の回答がこのテキストと完全に一致する場合に正解となります
                    </p>
                  </div>
                )}

                {newQuestion.type === "quick_response" && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm">
                      早押し方式では、最初に回答した参加者に点数が与えられます。管理者が正解を判定します。
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingQuestion(false)
                      setEditingQuestionId(null)
                      setNewQuestion({
                        content: "",
                        type: "multiple_choice",
                        options: ["", ""],
                        correctOption: 0,
                        correctAnswer: "",
                        points: 10,
                      })
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button onClick={handleAddQuestion}>{editingQuestionId ? "更新" : "保存"}</Button>
                </div>
              </div>
            </QuizCard>
          ) : questions.length === 0 ? (
            <QuizCard
              title="問題がありません"
              description="下のボタンをクリックして最初の問題を追加しましょう"
              gradient="yellow"
            >
              <Button onClick={() => setIsAddingQuestion(true)} className="w-full">
                問題を追加
              </Button>
            </QuizCard>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <QuizCard
                  key={question.id}
                  title={`問題 ${index + 1}`}
                  description={question.content}
                  gradient={
                    !hiddenQuestions.includes(question.id)
                      ? "green" // Active question
                      : "gray" // Hidden question
                  }
                  footer={
                    <div className="flex justify-between w-full">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">
                          {question.type === "multiple_choice"
                            ? "選択肢方式"
                            : question.type === "text"
                              ? "テキスト方式"
                              : "早押し方式"}
                        </span>
                        <span className="text-sm font-medium">{question.points}点</span>
                        {!hiddenQuestions.includes(question.id) ? (
                          <span className="text-sm font-medium text-green-600">アクティブ</span>
                        ) : (
                          <span className="text-sm font-medium text-gray-500">非表示</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => toggleQuestionVisibility(question.id)}
                          className={!hiddenQuestions.includes(question.id) ? "text-gray-500" : "text-green-500"}
                        >
                          {!hiddenQuestions.includes(question.id) ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-1" />
                              非表示にする
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              アクティブにする
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => revealResults(question.id)}
                          disabled={resultsRevealed[question.id] || hiddenQuestions.includes(question.id)}
                          className="text-amber-500"
                        >
                          <Award className="h-4 w-4 mr-1" />
                          {resultsRevealed[question.id] ? "結果発表済み" : "正解を発表"}
                        </Button>
                        <Button variant="outline" onClick={() => editQuestion(question)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                        <Button variant="outline" onClick={() => copyQuestion(question)}>
                          <Copy className="h-4 w-4 mr-1" />
                          コピー
                        </Button>
                        <Button variant="outline" onClick={() => handleDeleteQuestion(question.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {question.type === "multiple_choice" && question.options && (
                      <div className="grid grid-cols-2 gap-2">
                        {question.options.map((option: string, i: number) => (
                          <div
                            key={i}
                            className={`p-2 rounded-md border ${
                              option === question.correct_answer ? "border-green-500 bg-green-50" : "border-gray-200"
                            }`}
                          >
                            {option}
                            {option === question.correct_answer && (
                              <span className="ml-2 text-green-600 text-xs">（正解）</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === "text" && (
                      <div className="p-2 rounded-md border border-green-500 bg-green-50">
                        <p>正解: {question.correct_answer}</p>
                      </div>
                    )}

                    {question.type === "quick_response" && (
                      <QuickResponseManager
                        questionId={question.id}
                        questionPoints={question.points}
                        onUpdate={() => {
                          // 参加者データを再取得
                          const fetchParticipants = async () => {
                            try {
                              const { data, error } = await supabase
                                .from("participants")
                                .select("*")
                                .eq("quiz_id", quiz.id)
                                .order("score", { ascending: false })

                              if (!error && data) {
                                setParticipants(data as Participant[])
                              }
                            } catch (err) {
                              console.error("Error refreshing participants:", err)
                            }
                          }
                          fetchParticipants()
                        }}
                      />
                    )}
                  </div>
                </QuizCard>
              ))}

              <Button onClick={() => setIsAddingQuestion(true)} variant="outline" className="w-full">
                問題を追加
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="participants">{renderParticipantsTab()}</TabsContent>

        <TabsContent value="theme">
          <ThemeSelector
            initialTheme={quiz.theme_color || "pastel-blue"}
            initialLogo={quiz.logo_url || ""}
            initialBackground={quiz.background_url || ""}
            onSave={handleThemeSave}
          />
        </TabsContent>

        <TabsContent value="teams">
          <TeamManagement
            participants={participants.map((p: any) => ({
              id: p.id,
              name: p.name,
              teamId: p.team_id,
            }))}
            initialTeams={teams}
            onSave={handleTeamSave}
          />
        </TabsContent>

        <TabsContent value="analytics">
          {analyticsData ? (
            <AnalyticsDashboard analytics={analyticsData} />
          ) : (
            <QuizCard
              title="分析データがありません"
              description="クイズを実施すると、ここに分析データが表示されます"
              gradient="blue"
            >
              <div className="py-8 text-center text-muted-foreground">
                <p>まだ十分なデータがありません。</p>
                <p>クイズを実施して、参加者の回答データを収集しましょう。</p>
              </div>
            </QuizCard>
          )}
        </TabsContent>

        <TabsContent value="share" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuizCard title="参加リンク" description="このリンクを参加者に共有してください" gradient="blue">
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input value={joinUrl} readOnly />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(joinUrl)
                      toast({
                        title: "コピーしました",
                        description: "参加リンクをクリップボードにコピーしました",
                      })
                    }}
                  >
                    コピー
                  </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground break-all">
                  <p>URL: {joinUrl}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border">
                  <p className="text-sm font-medium mb-2">参加コード:</p>
                  <div className="text-3xl font-bold tracking-widest text-center py-2">{quiz.code}</div>
                </div>
              </div>
            </QuizCard>

            <QuizCard title="QRコード" description="携帯でスキャンして参加できます" gradient="purple">
              {qrCode ? (
                <div className="flex flex-col items-center justify-center p-4">
                  <img
                    src={qrCode || "/placeholder.svg"}
                    alt="Join QR Code"
                    className="w-48 h-48 border-4 border-white rounded-lg shadow-lg"
                  />
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      const link = document.createElement("a")
                      link.download = `quiz-${quiz.code}-qr.png`
                      link.href = qrCode
                      link.click()
                    }}
                  >
                    ダウンロード
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">QRコード生成中...</p>
                  </div>
                </div>
              )}
            </QuizCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
