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

    // まず、このクイズ用の早押し専用ダミー問題を取得または作成
    const { data: existingQuestion, error: questionFetchError } = await supabase
      .from("questions")
      .select("id")
      .eq("quiz_id", quizId)
      .eq("type", "quick_response")
      .eq("content", "早押し専用")
      .maybeSingle()

    let questionId: string

    if (existingQuestion) {
      questionId = existingQuestion.id
    } else {
      // 早押し専用の問題を作成
      const { data: newQuestion, error: createError } = await supabase
        .from("questions")
        .insert({
          quiz_id: quizId,
          content: "早押し専用",
          type: "quick_response",
          points: 10,
          order: 0,
        })
        .select()
        .single()

      if (createError) {
        console.error("Question creation error:", createError)
        return NextResponse.json(
          { error: "早押し問題の作成に失敗しました: " + createError.message },
          { status: 500 },
        )
      }

      questionId = newQuestion.id
    }

    // 早押しタイムスタンプを記録
    const { data: insertData, error: insertError } = await supabase
      .from("responses")
      .insert({
        participant_id: participantId,
        question_id: questionId,
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
