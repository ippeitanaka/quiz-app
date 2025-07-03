"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Timer } from "@/components/quiz/timer"

interface Media {
  id: string
  type: "image" | "audio" | "video"
  url: string
}

interface QuestionCardProps {
  question: {
    id: string
    text: string
    options: { id: string; text: string }[]
    media?: Media[]
    timeLimit?: number
  }
  onAnswer: (optionId: string, timeTaken: number) => void
  onTimeUp: () => void
}

export function QuestionCard({ question, onAnswer, onTimeUp }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number>(Date.now())

  useEffect(() => {
    setSelectedOption(null)
    setStartTime(Date.now())
  }, [question.id])

  const handleOptionSelect = (optionId: string) => {
    if (selectedOption) return

    setSelectedOption(optionId)
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)
    onAnswer(optionId, timeTaken)
  }

  const renderMedia = () => {
    if (!question.media || question.media.length === 0) return null

    const media = question.media[0]

    switch (media.type) {
      case "image":
        return (
          <div className="mb-4 flex justify-center">
            <img
              src={media.url || "/placeholder.svg"}
              alt="Question image"
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="relative">
        <CardTitle className="text-center text-xl font-medium">{question.text}</CardTitle>
        {question.timeLimit && (
          <div className="absolute right-4 top-4">
            <Timer duration={question.timeLimit} onTimeUp={onTimeUp} isActive={!selectedOption} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {renderMedia()}
        <div className="flex flex-col gap-2">
          {question.options.map((option) => (
            <Button
              key={option.id}
              variant={selectedOption === option.id ? "default" : "outline"}
              className={`justify-start text-left p-4 h-auto ${
                selectedOption && selectedOption !== option.id ? "opacity-70" : ""
              }`}
              onClick={() => handleOptionSelect(option.id)}
              disabled={!!selectedOption}
            >
              {option.text}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
