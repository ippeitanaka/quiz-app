import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

// 問題を更新するAPIエンドポイント
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { content, type, options, correct_answer, points, order } = await request.json()
    const questionId = params.id

    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    // 問題を更新
    const { data, error } = await adminSupabase
      .from("questions")
      .update({
        content,
        type,
        options: type === "multiple_choice" ? options : null,
        correct_answer,
        points,
        order,
      })
      .eq("id", questionId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating question:", error)
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 })
  }
}

// 問題を削除するAPIエンドポイント
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const questionId = params.id

    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    // 問題を削除
    const { error } = await adminSupabase.from("questions").delete().eq("id", questionId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting question:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
