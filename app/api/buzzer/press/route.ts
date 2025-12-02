import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId, quizId } = body

    if (!participantId || !quizId) {
      return NextResponse.json({ error: "参加者IDとクイズIDが必要です" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 早押しタイムスタンプを記録（buzzer_pressesテーブルを作成するか、既存のテーブルを使用）
    // ここでは簡易的にresponsesテーブルを使用
    const { data: insertData, error: insertError } = await supabase
      .from("responses")
      .insert({
        participant_id: participantId,
        question_id: quizId, // 早押し専用の場合、quizIdを使用（または専用のダミーquestionを作成）
        answer: "早押し",
        points_awarded: 0,
        responded_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json({ error: "早押しの記録に失敗しました: " + insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: insertData,
      message: "早押しを記録しました",
    })
  } catch (error) {
    console.error("Error in buzzer press:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "サーバーエラーが発生しました" },
      { status: 500 },
    )
  }
}
