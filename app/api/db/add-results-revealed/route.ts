import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: Request) {
  try {
    // Supabaseでは直接SQLを実行する機能が制限されているため、
    // 代わりにプログラム的にカラムの存在を確認し、存在しない場合のみ追加する

    // まず、active_questionsテーブルの構造を確認
    const { data: tableInfo, error: tableError } = await adminSupabase.from("active_questions").select("*").limit(1)

    if (tableError) {
      console.error("Error checking table structure:", tableError)
      return NextResponse.json({ error: tableError.message }, { status: 500 })
    }

    // results_revealedカラムが既に存在するかチェック
    const hasResultsRevealed =
      tableInfo && tableInfo.length > 0 && Object.prototype.hasOwnProperty.call(tableInfo[0], "results_revealed")

    if (hasResultsRevealed) {
      return NextResponse.json({
        success: true,
        message: "results_revealed column already exists",
      })
    }

    // カラムが存在しない場合は、管理者に手動でSQLを実行するよう促す
    return NextResponse.json({
      success: false,
      needsManualUpdate: true,
      message:
        "Please run the following SQL in the Supabase dashboard: ALTER TABLE active_questions ADD COLUMN IF NOT EXISTS results_revealed BOOLEAN DEFAULT FALSE;",
      sql: "ALTER TABLE active_questions ADD COLUMN IF NOT EXISTS results_revealed BOOLEAN DEFAULT FALSE;",
    })
  } catch (error) {
    console.error("Error adding results_revealed column:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
