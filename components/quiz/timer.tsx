"use client"

import { useState, useEffect } from "react"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"
import { cn } from "@/lib/utils"

interface TimerProps {
  duration: number
  onTimeUp: () => void
  isActive: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Timer({ duration, onTimeUp, isActive = true, size = "md", className }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const percentage = (timeLeft / duration) * 100

  // Reset timer when duration changes
  useEffect(() => {
    setTimeLeft(duration)
  }, [duration])

  // Timer logic
  useEffect(() => {
    if (!isActive) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // エラーが発生してもタイマーが止まるように try/catch で囲む
          try {
            onTimeUp()
          } catch (error) {
            console.error("Error in onTimeUp callback:", error)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [isActive, onTimeUp])

  const sizeClasses = {
    sm: "w-16 h-16 text-sm",
    md: "w-24 h-24 text-base",
    lg: "w-32 h-32 text-lg",
  }

  // カラーをタイムに応じて変更
  const getColor = () => {
    if (percentage > 60) return "#A5D6A7" // 緑っぽい色
    if (percentage > 30) return "#FFE082" // 黄色っぽい色
    return "#EF9A9A" // 赤っぽい色
  }

  return (
    <div className={cn(sizeClasses[size], className)}>
      <CircularProgressbar
        value={percentage}
        text={`${timeLeft}s`}
        styles={buildStyles({
          textSize: "1.5rem",
          pathColor: getColor(),
          textColor: getColor(),
          trailColor: "#F3F4F6",
        })}
      />
    </div>
  )
}
