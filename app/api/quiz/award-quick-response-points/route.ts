import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: Request) {
  try {
    const { participantId, questionId, points } = await request.json()

    console.log("Award points request:", { participantId, questionId, points })

    if (!participantId || !questionId || points === undefined) {
      return NextResponse.json({ error: "Participant ID, question ID, and points are required" }, { status: 400 })
    }

    // 参加者の早押し回答を更新（ポイントを付与）
    const { data: responseData, error: responseError } = await adminSupabase
      .from("responses")
      .update({
        points_awarded: points,
        is_correct: points > 0,
      })
      .eq("participant_id", participantId)
      .eq("question_id", questionId)
      .eq("answer", "早押し回答")
      .select()

    if (responseError) {
      console.error("Error updating response:", responseError)
      return NextResponse.json({ error: responseError.message }, { status: 500 })
    }

    if (!responseData || responseData.length === 0) {
      return NextResponse.json({ error: "該当する早押し回答が見つかりませんでした" }, { status: 404 })
    }

    console.log("Response updated:", responseData)

    // 参加者のスコアを更新
    if (points !== 0) {
      // 現在のスコアを取得
      const { data: participant, error: participantError } = await adminSupabase
        .from("participants")
        .select("score")
        .eq("id", participantId)
        .single()

      if (participantError) {
        console.error("Error fetching participant:", participantError)
        return NextResponse.json({ error: participantError.message }, { status: 500 })
      }

      console.log("Current participant score:", participant.score)

      // 新しいスコアを計算
      const newScore = (participant.score || 0) + points
      console.log("New score:", newScore)

      // スコアを更新
      const { data: updatedParticipant, error: updateError } = await adminSupabase
        .from("participants")
        .update({ score: newScore })
        .eq("id", participantId)
        .select()

      if (updateError) {
        console.error("Error updating participant score:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      console.log("Participant score updated:", updatedParticipant)
    }

    return NextResponse.json({
      success: true,
      message: `${points}ポイントが付与されました`,
      responseData,
    })
  } catch (error) {
    console.error("Error awarding quick response points:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
