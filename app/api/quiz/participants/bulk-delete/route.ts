import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: Request) {
  try {
    const { participantIds } = await request.json()

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: "参加者IDのリストが必要です" }, { status: 400 })
    }

    console.log("Bulk deleting participants:", participantIds)

    // 参加者を一括削除（関連する回答も自動的に削除される）
    const { error } = await adminSupabase.from("participants").delete().in("id", participantIds)

    if (error) {
      console.error("Error bulk deleting participants:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Bulk delete completed successfully")

    return NextResponse.json({
      success: true,
      message: `${participantIds.length}人の参加者を削除しました`,
    })
  } catch (error) {
    console.error("Error in bulk delete API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
