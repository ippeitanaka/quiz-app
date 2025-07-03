import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get("quizId")
    const name = searchParams.get("name")

    if (!quizId || !name) {
      return NextResponse.json({ error: "Quiz ID and name are required" }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from("participants")
      .select("id")
      .eq("quiz_id", quizId)
      .eq("name", name)
      .maybeSingle()

    if (error) {
      console.error("Error checking name:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ exists: !!data })
  } catch (error) {
    console.error("Error in check name API:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
