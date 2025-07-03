"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, Pencil, ImageIcon, Music, Video, MoveVertical } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { toast } from "@/hooks/use-toast"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

interface MediaType {
  id?: string
  type: "image" | "audio" | "video"
  url: string
}

interface Option {
  id?: string
  text: string
  is_correct: boolean
}

interface Question {
  id?: string
  quiz_id: string
  text: string
  order: number
  media?: MediaType[]
  options: Option[]
}

interface QuestionEditorProps {
  quizId: string
  initialQuestions: Question[]
}

export function QuestionEditor({ quizId, initialQuestions = [] }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const initNewQuestion = () => {
    return {
      quiz_id: quizId,
      text: "",
      order: questions.length,
      media: [],
      options: [
        { text: "", is_correct: true },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    }
  }

  const editQuestion = (question: Question) => {
    setActiveQuestion({ ...question })
    setIsEditing(true)
  }

  const addNewQuestion = () => {
    setActiveQuestion(initNewQuestion())
    setIsEditing(true)
  }

  const handleQuestionChange = (e) => {
    if (!activeQuestion) return

    setActiveQuestion({
      ...activeQuestion,
      text: e.target.value,
    })
  }

  const handleOptionChange = (index: number, field: string, value: any) => {
    if (!activeQuestion) return

    const updatedOptions = [...activeQuestion.options]

    if (field === "is_correct" && value) {
      // Only one option can be correct
      updatedOptions.forEach((option, i) => {
        if (i !== index) option.is_correct = false
      })
    }

    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value,
    }

    setActiveQuestion({
      ...activeQuestion,
      options: updatedOptions,
    })
  }

  const addMedia = (type: "image" | "audio" | "video") => {
    if (!activeQuestion) return

    const url = prompt(`Enter ${type} URL:`)
    if (!url) return

    const newMedia: MediaType = {
      type,
      url,
    }

    setActiveQuestion({
      ...activeQuestion,
      media: [...(activeQuestion.media || []), newMedia],
    })
  }

  const removeMedia = (index: number) => {
    if (!activeQuestion || !activeQuestion.media) return

    const updatedMedia = [...activeQuestion.media]
    updatedMedia.splice(index, 1)

    setActiveQuestion({
      ...activeQuestion,
      media: updatedMedia,
    })
  }

  const saveQuestion = async () => {
    if (!activeQuestion) return

    try {
      if (!activeQuestion.text.trim()) {
        toast({
          title: "エラー",
          description: "問題文を入力してください",
          variant: "destructive",
        })
        return
      }

      // 選択肢のバリデーション
      const hasEmptyOption = activeQuestion.options.some((option) => !option.text.trim())
      if (hasEmptyOption) {
        toast({
          title: "エラー",
          description: "空の選択肢があります",
          variant: "destructive",
        })
        return
      }

      const hasCorrectOption = activeQuestion.options.some((option) => option.is_correct)
      if (!hasCorrectOption) {
        toast({
          title: "エラー",
          description: "正解の選択肢を選んでください",
          variant: "destructive",
        })
        return
      }

      if (activeQuestion.id) {
        // 既存の問題を更新
        const { error } = await supabase
          .from("questions")
          .update({
            text: activeQuestion.text,
            updated_at: new Date(),
          })
          .eq("id", activeQuestion.id)

        if (error) throw error

        // 選択肢を更新
        for (const option of activeQuestion.options) {
          if (option.id) {
            await supabase
              .from("options")
              .update({
                text: option.text,
                is_correct: option.is_correct,
                updated_at: new Date(),
              })
              .eq("id", option.id)
          } else {
            await supabase.from("options").insert({
              question_id: activeQuestion.id,
              text: option.text,
              is_correct: option.is_correct,
            })
          }
        }

        // メディアを更新
        if (activeQuestion.media && activeQuestion.media.length > 0) {
          // 既存のメディアを削除
          await supabase.from("media").delete().eq("question_id", activeQuestion.id)

          // 新しいメディアを追加
          for (const media of activeQuestion.media) {
            await supabase.from("media").insert({
              question_id: activeQuestion.id,
              type: media.type,
              url: media.url,
            })
          }
        } else {
          // メディアを全て削除
          await supabase.from("media").delete().eq("question_id", activeQuestion.id)
        }
      } else {
        // 新しい問題を作成
        const { data, error } = await supabase
          .from("questions")
          .insert({
            quiz_id: quizId,
            text: activeQuestion.text,
            order: activeQuestion.order,
          })
          .select()

        if (error) throw error

        const newQuestionId = data[0].id

        // 選択肢を作成
        for (const option of activeQuestion.options) {
          await supabase.from("options").insert({
            question_id: newQuestionId,
            text: option.text,
            is_correct: option.is_correct,
          })
        }

        // メディアを作成
        if (activeQuestion.media && activeQuestion.media.length > 0) {
          for (const media of activeQuestion.media) {
            await supabase.from("media").insert({
              question_id: newQuestionId,
              type: media.type,
              url: media.url,
            })
          }
        }
      }

      // 問題リストを更新
      const { data: updatedQuestions, error: fetchError } = await supabase
        .from("questions")
        .select(`
          *,
          options(*),
          media(*)
        `)
        .eq("quiz_id", quizId)
        .order("order", { ascending: true })

      if (fetchError) throw fetchError

      setQuestions(updatedQuestions || [])
      setActiveQuestion(null)
      setIsEditing(false)

      toast({
        title: "保存完了",
        description: "問題が正常に保存されました",
      })
    } catch (error) {
      console.error("Error saving question:", error)
      toast({
        title: "エラー",
        description: "問題の保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  const deleteQuestion = async (questionId: string) => {
    if (!confirm("この問題を削除してもよろしいですか？")) return

    try {
      const { error } = await supabase.from("questions").delete().eq("id", questionId)

      if (error) throw error

      // 問題リストを更新
      setQuestions(questions.filter((q) => q.id !== questionId))

      toast({
        title: "削除完了",
        description: "問題が正常に削除されました",
      })
    } catch (error) {
      console.error("Error deleting question:", error)
      toast({
        title: "エラー",
        description: "問題の削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleDragEnd = async (result) => {
    if (!result.destination) return

    const reorderedQuestions = Array.from(questions)
    const [movedQuestion] = reorderedQuestions.splice(result.source.index, 1)
    reorderedQuestions.splice(result.destination.index, 0, movedQuestion)

    // Update orders
    const updatedQuestions = reorderedQuestions.map((q, index) => ({
      ...q,
      order: index,
    }))

    setQuestions(updatedQuestions)

    // Update in database
    try {
      for (const question of updatedQuestions) {
        await supabase.from("questions").update({ order: question.order }).eq("id", question.id)
      }
    } catch (error) {
      console.error("Error updating question order:", error)
      toast({
        title: "エラー",
        description: "問題の順序更新に失敗しました",
        variant: "destructive",
      })
    }
  }

  const cancelEdit = () => {
    setActiveQuestion(null)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4">
      {isEditing ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="question">問題文</Label>
              <Input
                id="question"
                value={activeQuestion?.text || ""}
                onChange={handleQuestionChange}
                placeholder="問題文を入力してください"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>メディア</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addMedia("image")}>
                    <ImageIcon className="h-4 w-4 mr-1" />
                    画像
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addMedia("audio")}>
                    <Music className="h-4 w-4 mr-1" />
                    音声
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addMedia("video")}>
                    <Video className="h-4 w-4 mr-1" />
                    動画
                  </Button>
                </div>
              </div>

              {activeQuestion?.media && activeQuestion.media.length > 0 ? (
                <div className="space-y-2">
                  {activeQuestion.media.map((media, index) => (
                    <div key={index} className="flex items-center gap-2 border p-2 rounded-md">
                      {media.type === "image" && <ImageIcon className="h-4 w-4" />}
                      {media.type === "audio" && <Music className="h-4 w-4" />}
                      {media.type === "video" && <Video className="h-4 w-4" />}
                      <span className="flex-1 truncate">{media.url}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeMedia(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">メディアがありません</div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>選択肢</Label>
              {activeQuestion?.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Switch
                    checked={option.is_correct}
                    onCheckedChange={(checked) => handleOptionChange(index, "is_correct", checked)}
                  />
                  <Input
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, "text", e.target.value)}
                    placeholder={`選択肢 ${index + 1}`}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit}>
                キャンセル
              </Button>
              <Button onClick={saveQuestion}>保存</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={addNewQuestion}>
              <Plus className="h-4 w-4 mr-1" />
              問題を追加
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="questions">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {questions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      問題がありません。「問題を追加」ボタンをクリックして問題を作成してください。
                    </div>
                  ) : (
                    questions.map((question, index) => (
                      <Draggable key={question.id} draggableId={question.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="border rounded-md p-4 bg-background"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">
                                  Q{index + 1}: {question.text}
                                </div>

                                {question.media && question.media.length > 0 && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {question.media.map((media, i) => (
                                      <span key={i} className="mr-2">
                                        {media.type === "image" && "画像"}
                                        {media.type === "audio" && "音声"}
                                        {media.type === "video" && "動画"}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-2 text-sm">
                                  {question.options.map((option, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                      <span className={option.is_correct ? "text-green-600 font-medium" : ""}>
                                        {option.text}
                                      </span>
                                      {option.is_correct && <span className="text-green-600 text-xs">(正解)</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div {...provided.dragHandleProps}>
                                  <MoveVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => editQuestion(question)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteQuestion(question.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </>
      )}
    </div>
  )
}
