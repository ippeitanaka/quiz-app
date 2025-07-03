import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: Request) {
  try {
    const { quizId, questionId } = await request.json()

    if (!quizId || !questionId) {
      return NextResponse.json({ error: "Quiz ID and Question ID are required" }, { status: 400 })
    }

    // First, deactivate any currently active questions for this quiz
    await adminSupabase.from("active_questions").delete().eq("quiz_id", quizId)

    // Then, activate the new question
    // results_revealedカラムが存在するかチェック
    const { data: tableInfo, error: tableError } = await adminSupabase.from("active_questions").select("*").limit(1)

    // 新しい問題を追加（results_revealedカラムの有無に応じて）
    let insertData = {
      quiz_id: quizId,
      question_id: questionId,
      activated_at: new Date().toISOString(),
    }

    // テーブル情報が取得できて、かつresults_revealedカラムが存在する場合のみ追加
    if (!tableError && tableInfo && tableInfo.length > 0) {
      const columns = Object.keys(tableInfo[0])
      if (columns.includes("results_revealed")) {
        insertData = {
          ...insertData,
          results_revealed: false,
        }
      }
    }

    const { data, error } = await adminSupabase.from("active_questions").insert(insertData).select().single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error setting active question:", error)
    return NextResponse.json({ error: "Failed to set active question" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const quizId = searchParams.get("quizId")

  if (!quizId) {
    return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 })
  }

  try {
    const { error } = await adminSupabase.from("active_questions").delete().eq("quiz_id", quizId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing active question:", error)
    return NextResponse.json({ error: "Failed to remove active question" }, { status: 500 })
  }
}
