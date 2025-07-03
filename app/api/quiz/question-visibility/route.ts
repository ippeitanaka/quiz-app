import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: Request) {
  try {
    const { quizId, questionId, visible } = await request.json()

    if (!quizId || !questionId || visible === undefined) {
      return NextResponse.json({ error: "Quiz ID, question ID, and visibility are required" }, { status: 400 })
    }

    if (visible) {
      // Make question visible
      // First check if there's already an active question for this quiz
      const { data: existingActive, error: checkError } = await adminSupabase
        .from("active_questions")
        .select("*")
        .eq("quiz_id", quizId)

      if (checkError) throw checkError

      if (existingActive && existingActive.length > 0) {
        // Update existing active question
        const { data, error } = await adminSupabase
          .from("active_questions")
          .update({
            question_id: questionId,
            activated_at: new Date().toISOString(),
            results_revealed: false,
          })
          .eq("quiz_id", quizId)
          .select()

        if (error) throw error
        return NextResponse.json({ data, action: "updated" })
      } else {
        // Insert new active question
        const { data, error } = await adminSupabase
          .from("active_questions")
          .insert({
            quiz_id: quizId,
            question_id: questionId,
            activated_at: new Date().toISOString(),
            results_revealed: false,
          })
          .select()

        if (error) throw error
        return NextResponse.json({ data, action: "inserted" })
      }
    } else {
      // Make question hidden (remove from active_questions)
      const { error } = await adminSupabase
        .from("active_questions")
        .delete()
        .eq("quiz_id", quizId)
        .eq("question_id", questionId)

      if (error) throw error
      return NextResponse.json({ success: true, action: "deleted" })
    }
  } catch (error) {
    console.error("Error toggling question visibility:", error)
    return NextResponse.json({ error: "Failed to toggle question visibility" }, { status: 500 })
  }
}
