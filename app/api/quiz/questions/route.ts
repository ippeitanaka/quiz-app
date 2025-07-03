import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

// 問題を追加するAPIエンドポイント
export async function POST(request: Request) {
  try {
    const { quizId, content, type, options, correct_answer, points, order } = await request.json()

    if (!quizId || !content || !type) {
      return NextResponse.json({ error: "Quiz ID, content, and type are required" }, { status: 400 })
    }

    // 新しい問題を作成
    const { data, error } = await adminSupabase
      .from("questions")
      .insert({
        quiz_id: quizId,
        content,
        type,
        options: type === "multiple_choice" ? options : null,
        correct_answer,
        points: points || 10,
        order: order || 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error creating question:", error)
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 })
  }
}

// 問題を取得するAPIエンドポイント
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const quizId = searchParams.get("quizId")

  if (!quizId) {
    return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 })
  }

  try {
    const { data, error } = await adminSupabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching questions:", error)
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}
