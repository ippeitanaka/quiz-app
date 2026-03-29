import { type NextRequest, NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get("quizId")

    if (!quizId) {
      return NextResponse.json({ success: false, error: "quizId is required" }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from("question_corner_posts")
      .select("*")
      .eq("quiz_id", quizId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quizId, participantId, participantName, questions } = body

    if (!quizId || !participantId || !Array.isArray(questions)) {
      return NextResponse.json(
        {
          success: false,
          error: "quizId, participantId, questions are required",
        },
        { status: 400 },
      )
    }

    const normalized = questions
      .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
      .filter((item: string) => item.length > 0)

    if (normalized.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one non-empty question is required",
        },
        { status: 400 },
      )
    }

    const insertRows = normalized.map((content: string) => ({
      quiz_id: quizId,
      participant_id: participantId,
      participant_name: participantName || "匿名",
      content,
      created_at: new Date().toISOString(),
    }))

    const { data, error } = await adminSupabase.from("question_corner_posts").insert(insertRows).select("id")

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      count: data?.length || insertRows.length,
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
