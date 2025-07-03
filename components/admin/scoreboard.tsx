"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import type { Participant } from "@/lib/supabase/schema"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/supabase"

interface ScoreBoardProps {
  participants: Participant[]
  quizId: string
}

export function ScoreBoard({ participants, quizId }: ScoreBoardProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editScore, setEditScore] = useState<number>(0)

  const handleEditScore = (participant: Participant) => {
    setEditingId(participant.id)
    setEditScore(participant.score)
  }

  const handleSaveScore = async () => {
    if (!editingId) return

    try {
      await supabase.from("participants").update({ score: editScore }).eq("id", editingId)

      setEditingId(null)
    } catch (err) {
      console.error("Failed to update score:", err)
    }
  }

  return (
    <QuizCard title="スコアボード" description="参加者のスコアと順位" gradient="green">
      <div className="space-y-4">
        {participants.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            まだ参加者がいません。クイズをアクティブにして、参加リンクを共有してください。
          </p>
        ) : (
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div key={participant.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-3">
                  <span className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium">{participant.name}</span>
                </div>

                {editingId === participant.id ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(Number(e.target.value))}
                      className="w-20"
                    />
                    <Button size="sm" onClick={handleSaveScore}>
                      保存
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-primary">{participant.score} 点</span>
                    <Button variant="ghost" size="sm" onClick={() => handleEditScore(participant)}>
                      編集
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Export scoreboard to CSV logic
            }}
          >
            スコアをエクスポート
          </Button>
        </div>
      </div>
    </QuizCard>
  )
}
