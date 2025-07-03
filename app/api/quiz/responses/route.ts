import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: Request) {
  try {
    const { questionId, participantId, answer } = await request.json()

    if (!questionId || !participantId || answer === undefined) {
      return NextResponse.json({ error: "Question ID, participant ID, and answer are required" }, { status: 400 })
    }

    console.log(`Processing response for question: ${questionId}, participant: ${participantId}, answer: ${answer}`)

    // 問題の情報を取得
    const { data: question, error: questionError } = await adminSupabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .single()

    if (questionError) {
      console.error("Error fetching question:", questionError)
      return NextResponse.json({ error: `Failed to fetch question: ${questionError.message}` }, { status: 500 })
    }

    if (!question) {
      console.error("Question not found:", questionId)
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    console.log("Question data:", question)

    // 正解かどうかを判定
    let isCorrect = false
    let pointsAwarded = 0

    if (question.type === "multiple_choice" || question.type === "text") {
      // 選択肢方式またはテキスト方式の場合、正解と比較
      isCorrect = answer === question.correct_answer
      pointsAwarded = isCorrect ? question.points : 0
    } else if (question.type === "quick_response") {
      // 早押し方式の場合、最初の回答者にポイントを与える
      // 既存の回答を確認
      const { data: existingResponses, error: responsesError } = await adminSupabase
        .from("responses")
        .select("id")
        .eq("question_id", questionId)

      if (responsesError) {
        console.error("Error checking existing responses:", responsesError)
        return NextResponse.json(
          { error: `Failed to check existing responses: ${responsesError.message}` },
          { status: 500 },
        )
      }

      // 最初の回答者の場合、仮のポイントを与える（管理者が後で調整可能）
      if (existingResponses.length === 0) {
        pointsAwarded = question.points
      }
    }

    console.log(`Answer evaluation: isCorrect=${isCorrect}, pointsAwarded=${pointsAwarded}`)

    // 回答を保存
    const { data, error } = await adminSupabase
      .from("responses")
      .insert({
        question_id: questionId,
        participant_id: participantId,
        answer,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        responded_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error inserting response:", error)
      return NextResponse.json({ error: `Failed to insert response: ${error.message}` }, { status: 500 })
    }

    // 正解の場合、参加者のスコアを更新
    if (pointsAwarded > 0) {
      // 現在のスコアを取得
      const { data: participant, error: participantError } = await adminSupabase
        .from("participants")
        .select("score")
        .eq("id", participantId)
        .single()

      if (participantError) {
        console.error("Error fetching participant:", participantError)
        return NextResponse.json({ error: `Failed to fetch participant: ${participantError.message}` }, { status: 500 })
      }

      // スコアを更新
      const newScore = (participant.score || 0) + pointsAwarded
      await adminSupabase.from("participants").update({ score: newScore }).eq("id", participantId)
    }

    return NextResponse.json({ data, isCorrect, pointsAwarded })
  } catch (error: any) {
    console.error("Error submitting response:", error)
    return NextResponse.json(
      { error: `Failed to submit response: ${error.message || "Unknown error"}` },
      { status: 500 },
    )
  }
}

// 参加者の回答を取得するAPIエンドポイント
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const questionId = searchParams.get("questionId")
  const participantId = searchParams.get("participantId")

  if (!questionId && !participantId) {
    return NextResponse.json({ error: "Question ID or participant ID is required" }, { status: 400 })
  }

  try {
    let query = adminSupabase.from("responses").select("*")

    if (questionId) {
      query = query.eq("question_id", questionId)
    }

    if (participantId) {
      query = query.eq("participant_id", participantId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error fetching responses:", error)
    return NextResponse.json(
      { error: `Failed to fetch responses: ${error.message || "Unknown error"}` },
      { status: 500 },
    )
  }
}
