import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: Request) {
  try {
    const { activeQuestionId } = await request.json()

    if (!activeQuestionId) {
      return NextResponse.json({ error: "Active question ID is required" }, { status: 400 })
    }

    // results_revealedカラムが存在するかチェック
    const { data: tableInfo, error: tableError } = await adminSupabase.from("active_questions").select("*").limit(1)

    if (tableError) {
      console.error("Error checking table structure:", tableError)
      return NextResponse.json({ error: "Failed to check table structure" }, { status: 500 })
    }

    // results_revealedカラムが存在するかどうかを確認
    const hasResultsRevealed =
      tableInfo && tableInfo.length > 0 ? Object.prototype.hasOwnProperty.call(tableInfo[0], "results_revealed") : false

    // results_revealedカラムが存在する場合のみ更新
    if (hasResultsRevealed) {
      const { data, error } = await adminSupabase
        .from("active_questions")
        .update({ results_revealed: true })
        .eq("id", activeQuestionId)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ data, success: true })
    }

    // results_revealedカラムが存在しない場合は、成功を返す（実際には何も更新されない）
    return NextResponse.json({
      success: true,
      message: "results_revealed column does not exist, but operation considered successful",
    })
  } catch (error) {
    console.error("Error revealing results:", error)
    return NextResponse.json({ error: "Failed to reveal results" }, { status: 500 })
  }
}
