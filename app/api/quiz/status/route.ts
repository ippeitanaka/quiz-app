import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    console.log("Checking quiz status for code:", code)

    // キャッシュを無効化するためにタイムスタンプを追加
    const timestamp = new Date().getTime()
    const { data, error } = await supabase
      .from("quizzes")
      .select("id, is_active, title")
      .eq("code", code.toString())
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          details: error.message,
          code: code,
        },
        { status: 500 },
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Quiz not found",
          code: code,
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      data,
      message: "Quiz status retrieved successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error checking quiz status:", error)
    return NextResponse.json(
      {
        error: "Failed to check quiz status",
        details: String(error),
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 },
    )
  }
}
