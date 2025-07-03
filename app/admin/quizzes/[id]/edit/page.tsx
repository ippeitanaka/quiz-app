"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase-client"
import { QuestionEditor } from "@/components/quiz/question-editor"
import { ThemeSelector } from "@/components/quiz/theme-selector"
import { TeamManagement } from "@/components/quiz/team-management"
import { toast } from "@/hooks/use-toast"

export default function EditQuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string

  const [quiz, setQuiz] = useState({
    id: "",
    title: "",
    description: "",
    time_limit_per_question: 30,
    theme_color: "pastel-blue",
    logo_url: "",
    background_url: "",
  })

  const [questions, setQuestions] = useState([])
  const [participants, setParticipants] = useState([])
  const [teams, setTeams] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .single()

        if (quizError) throw quizError

        setQuiz(quizData)

        // 質問を取得
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select(`
            *,
            options(*),
            media(*)
          `)
          .eq("quiz_id", quizId)
          .order("order", { ascending: true })

        if (questionsError) throw questionsError
        setQuestions(questionsData || [])

        // 参加者を取得
        const { data: participantsData, error: participantsError } = await supabase
          .from("participants")
          .select("*")
          .eq("quiz_id", quizId)

        if (participantsError) throw participantsError
        setParticipants(participantsData || [])

        // チームを取得
        const { data: teamsData, error: teamsError } = await supabase.from("teams").select("*").eq("quiz_id", quizId)

        if (teamsError) throw teamsError
        setTeams(teamsData || [])

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching quiz data:", error)
        toast({
          title: "エラー",
          description: "クイズデータの取得に失敗しました",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchQuizData()
  }, [quizId])

  const handleQuizChange = (e) => {
    const { name, value } = e.target
    setQuiz((prev) => ({ ...prev, [name]: value }))
  }

  const saveQuiz = async () => {
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({
          title: quiz.title,
          description: quiz.description,
          time_limit_per_question: quiz.time_limit_per_question,
          theme_color: quiz.theme_color,
          logo_url: quiz.logo_url,
          background_url: quiz.background_url,
          updated_at: new Date(),
        })
        .eq("id", quizId)

      if (error) throw error

      toast({
        title: "保存完了",
        description: "クイズが正常に保存されました",
      })
    } catch (error) {
      console.error("Error saving quiz:", error)
      toast({
        title: "エラー",
        description: "クイズの保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleThemeSave = async (theme) => {
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({
          theme_color: theme.color,
          logo_url: theme.logo || "",
          background_url: theme.background || "",
          updated_at: new Date(),
        })
        .eq("id", quizId)

      if (error) throw error

      setQuiz((prev) => ({
        ...prev,
        theme_color: theme.color,
        logo_url: theme.logo || "",
        background_url: theme.background || "",
      }))

      toast({
        title: "テーマ保存完了",
        description: "クイズのテーマが正常に保存されました",
      })
    } catch (error) {
      console.error("Error saving theme:", error)
      toast({
        title: "エラー",
        description: "テーマの保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleTeamSave = async (updatedTeams) => {
    try {
      // チームを更新
      for (const team of updatedTeams) {
        if (team.id.startsWith("new-")) {
          // 新規チーム
          const { data, error } = await supabase
            .from("teams")
            .insert({
              quiz_id: quizId,
              name: team.name,
              created_at: new Date(),
            })
            .select()

          if (error) throw error

          const newTeamId = data[0].id

          // 参加者をチームに割り当て
          for (const participant of team.participants) {
            await supabase.from("participants").update({ team_id: newTeamId }).eq("id", participant.id)
          }
        } else {
          // 既存チーム
          await supabase.from("teams").update({ name: team.name }).eq("id", team.id)

          // まず全ての参加者のチーム割り当てを解除
          await supabase.from("participants").update({ team_id: null }).eq("team_id", team.id)

          // 新しい参加者をチームに割り当て
          for (const participant of team.participants) {
            await supabase.from("participants").update({ team_id: team.id }).eq("id", participant.id)
          }
        }
      }

      // 削除されたチームの処理
      const existingTeamIds = teams.map((t) => t.id)
      const updatedTeamIds = updatedTeams.filter((t) => !t.id.startsWith("new-")).map((t) => t.id)

      for (const teamId of existingTeamIds) {
        if (!updatedTeamIds.includes(teamId)) {
          await supabase.from("participants").update({ team_id: null }).eq("team_id", teamId)

          await supabase.from("teams").delete().eq("id", teamId)
        }
      }

      toast({
        title: "チーム保存完了",
        description: "チーム設定が正常に保存されました",
      })

      // チームデータを再取得
      const { data: refreshedTeams } = await supabase.from("teams").select("*").eq("quiz_id", quizId)

      setTeams(refreshedTeams || [])
    } catch (error) {
      console.error("Error saving teams:", error)
      toast({
        title: "エラー",
        description: "チーム設定の保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-10">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>{quiz.title} - 編集</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">基本設定</TabsTrigger>
              <TabsTrigger value="questions">問題管理</TabsTrigger>
              <TabsTrigger value="theme">テーマ設定</TabsTrigger>
              <TabsTrigger value="teams">チーム設定</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">タイトル</label>
                  <Input name="title" value={quiz.title} onChange={handleQuizChange} />
                </div>

                <div>
                  <label className="block mb-1">説明</label>
                  <Textarea name="description" value={quiz.description} onChange={handleQuizChange} rows={4} />
                </div>

                <div>
                  <label className="block mb-1">問題あたりの制限時間（秒）</label>
                  <Input
                    name="time_limit_per_question"
                    type="number"
                    value={quiz.time_limit_per_question}
                    onChange={handleQuizChange}
                    min={5}
                    max={300}
                  />
                </div>

                <Button onClick={saveQuiz}>保存</Button>
              </div>
            </TabsContent>

            <TabsContent value="questions">
              <QuestionEditor quizId={quizId} initialQuestions={questions} />
            </TabsContent>

            <TabsContent value="theme">
              <ThemeSelector
                initialTheme={quiz.theme_color}
                initialLogo={quiz.logo_url}
                initialBackground={quiz.background_url}
                onSave={handleThemeSave}
              />
            </TabsContent>

            <TabsContent value="teams">
              <TeamManagement participants={participants} initialTeams={teams} onSave={handleTeamSave} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
