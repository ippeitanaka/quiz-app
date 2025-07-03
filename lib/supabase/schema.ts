// This file defines our database schema for reference

export type Quiz = {
  id: string
  admin_id: string
  title: string
  description: string
  code: string // 4-digit code
  created_at: string
  is_active: boolean
  time_limit_per_question?: number
  theme_color?: string
  logo_url?: string
  background_url?: string
}

export type Question = {
  id: string
  quiz_id: string
  content: string
  type: "multiple_choice" | "text" | "quick_response"
  options?: string[] // For multiple choice questions
  correct_answer?: string // Optional correct answer
  points: number
  order: number
  media?: Media[]
}

export type Media = {
  id: string
  question_id: string
  type: "image" | "audio" | "video"
  url: string
  created_at: string
  updated_at: string
}

export type Participant = {
  id: string
  quiz_id: string
  name: string
  score: number
  joined_at: string
  team_id?: string
}

export type Team = {
  id: string
  quiz_id: string
  name: string
  created_at: string
  participants?: Participant[]
}

export type Response = {
  id: string
  question_id: string
  participant_id: string
  answer: string
  is_correct?: boolean
  points_awarded: number
  responded_at: string
  time_taken?: number
}
