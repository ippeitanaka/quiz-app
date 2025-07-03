import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get("quizId")

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 })
    }

    const { data, error } = await adminSupabase.from("active_questions").select("*").eq("quiz_id", quizId)

    if (error) {
      console.error("Error fetching active questions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in active questions API:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
