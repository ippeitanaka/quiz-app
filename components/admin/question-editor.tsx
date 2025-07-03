"use client"

import { useState } from "react"
import { QuizCard } from "@/components/ui/quiz-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Question } from "@/lib/supabase/schema"
import { Trash2, CheckCircle, Play } from "lucide-react"

interface QuestionEditorProps {
  question: Question
  index: number
  onUpdate: (question: Question) => void
  onDelete: () => void
  onSetActive?: () => void
  isActive?: boolean
}

export function QuestionEditor({
  question,
  index,
  onUpdate,
  onDelete,
  onSetActive,
  isActive = false,
}: QuestionEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(question.content)
  const [type, setType] = useState(question.type)
  const [options, setOptions] = useState<string[]>(question.options || [])
  const [correctOption, setCorrectOption] = useState<number>(
    question.correct_answer && question.options
      ? question.options.findIndex((opt) => opt === question.correct_answer)
      : 0,
  )
  const [correctAnswer, setCorrectAnswer] = useState(question.correct_answer || "")
  const [points, setPoints] = useState(question.points)

  const handleSave = () => {
    // 正解の設定
    let finalCorrectAnswer = ""
    if (type === "multiple_choice" && options.length > 0) {
      finalCorrectAnswer = options[correctOption]
    } else if (type === "text") {
      finalCorrectAnswer = correctAnswer
    }

    onUpdate({
      ...question,
      content,
      type,
      options: type === "multiple_choice" ? options : undefined,
      correct_answer: finalCorrectAnswer,
      points,
    })
    setIsEditing(false)
  }

  const handleAddOption = () => {
    setOptions([...options, ""])
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleRemoveOption = (index: number) => {
    const newOptions = [...options]
    newOptions.splice(index, 1)
    setOptions(newOptions)

    // 削除した選択肢が正解だった場合、正解を最初の選択肢に設定
    if (correctOption === index) {
      setCorrectOption(0)
    } else if (correctOption > index) {
      // 削除した選択肢より後ろの選択肢が正解だった場合、インデックスを調整
      setCorrectOption(correctOption - 1)
    }
  }

  const questionTypeLabels = {
    multiple_choice: "選択肢方式",
    text: "テキスト方式",
    quick_response: "早押し方式",
  }

  return (
    <QuizCard
      title={isEditing ? "問題を編集" : `問題 ${index + 1}`}
      description={isEditing ? "" : question.content}
      gradient={isActive ? "green" : ["pink", "green", "yellow", "blue", "purple"][index % 5]}
      footer={
        isEditing ? (
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        ) : (
          <div className="flex justify-between w-full">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">{questionTypeLabels[question.type]}</span>
              <span className="text-sm font-medium">{question.points}点</span>
              {isActive && <span className="text-sm font-medium text-green-600">アクティブ</span>}
            </div>
            <div className="flex space-x-2">
              {onSetActive && !isActive && (
                <Button variant="outline" onClick={onSetActive} className="text-green-500">
                  <Play className="h-4 w-4 mr-1" />
                  アクティブにする
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                編集
              </Button>
              <Button variant="outline" className="text-red-500" onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )
      }
    >
      {isEditing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              問題内容
            </label>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
                質問タイプ
              </label>
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as "multiple_choice" | "text" | "quick_response")
                  if (value === "multiple_choice" && options.length === 0) {
                    setOptions(["", ""])
                  }
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
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                min={1}
                max={100}
              />
            </div>
          </div>

          {type === "multiple_choice" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">選択肢</label>
                <span className="text-xs text-muted-foreground">正解の選択肢を選んでください</span>
              </div>

              <RadioGroup value={correctOption.toString()} onValueChange={(value) => setCorrectOption(Number(value))}>
                {options.map((option, i) => (
                  <div key={i} className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value={i.toString()} id={`option-${i}`} />
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
                        disabled={options.length <= 2}
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

          {type === "text" && (
            <div className="space-y-2">
              <label htmlFor="correctAnswer" className="text-sm font-medium">
                正解
              </label>
              <Input
                id="correctAnswer"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="正解のテキストを入力"
              />
              <p className="text-xs text-muted-foreground">
                参加者の回答がこのテキストと完全に一致する場合に正解となります
              </p>
            </div>
          )}

          {type === "quick_response" && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm">
                早押し方式では、最初に回答した参加者に点数が与えられます。管理者が正解を判定します。
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {question.type === "multiple_choice" && question.options && (
            <div className="mt-2 space-y-2">
              {question.options.map((option, i) => (
                <div
                  key={i}
                  className={`flex items-center space-x-2 ${
                    option === question.correct_answer ? "text-green-600 font-medium" : ""
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full ${
                      option === question.correct_answer ? "bg-green-100" : "bg-accent/20"
                    } flex items-center justify-center text-sm`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span>{option}</span>
                  {option === question.correct_answer && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
              ))}
            </div>
          )}

          {question.type === "text" && question.correct_answer && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">正解: {question.correct_answer}</span>
              </div>
            </div>
          )}
        </>
      )}
    </QuizCard>
  )
}
