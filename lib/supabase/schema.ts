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

export type QuestionCornerPost = {
  id: string
  quiz_id: string
  participant_id: string
  participant_name: string
  content: string
  created_at: string
}

export type Scoreboard = {
  id: string
  admin_id: string
  title: string
  description: string | null
  mode: "individual" | "group"
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ScoreboardEntry = {
  id: string
  scoreboard_id: string
  name: string
  entry_type: "individual" | "group"
  score: number
  color_index: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type ScoreboardEvent = {
  id: string
  scoreboard_id: string
  entry_id: string | null
  event_type: "manual" | "quick_add" | "quick_subtract" | "challenge" | "reset"
  delta: number
  previous_score: number | null
  new_score: number | null
  challenge_value: number | null
  metadata: Record<string, unknown>
  created_at: string
}
