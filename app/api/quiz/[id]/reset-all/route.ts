import { type NextRequest, NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quizId = params.id

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 })
    }

    const { data: questions, error: questionsError } = await adminSupabase
      .from("questions")
      .select("id")
      .eq("quiz_id", quizId)

    if (questionsError) {
      throw questionsError
    }

    const questionIds = (questions || []).map((question) => question.id)

    if (questionIds.length > 0) {
      const { error: responsesError } = await adminSupabase.from("responses").delete().in("question_id", questionIds)

      if (responsesError) {
        throw responsesError
      }
    }

    const { error: participantsError } = await adminSupabase.from("participants").update({ score: 0 }).eq("quiz_id", quizId)

    if (participantsError) {
      throw participantsError
    }

    const { error: activeQuestionsError } = await adminSupabase.from("active_questions").delete().eq("quiz_id", quizId)

    if (activeQuestionsError) {
      throw activeQuestionsError
    }

    try {
      const { error: questionCornerError } = await adminSupabase.from("question_corner_posts").delete().eq("quiz_id", quizId)

      if (questionCornerError && !questionCornerError.message.includes("does not exist")) {
        throw questionCornerError
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes("does not exist")) {
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      message: "Quiz state reset successfully",
    })
  } catch (error) {
    console.error("Error resetting quiz state:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}