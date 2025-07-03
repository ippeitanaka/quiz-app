import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const quizId = searchParams.get("quizId")

    if (!id && !quizId) {
      return NextResponse.json({ error: "Participant ID or Quiz ID is required" }, { status: 400 })
    }

    let query = adminSupabase.from("participants").select("*")

    if (id) {
      query = query.eq("id", id)
    }

    if (quizId) {
      query = query.eq("quiz_id", quizId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching participants:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (id && data && data.length > 0) {
      // 単一の参加者を返す
      return NextResponse.json({ data: data[0] })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in participants API:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
