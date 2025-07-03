import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get("questionId")

    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    console.log("Fetching quick responses for question:", questionId)

    // 早押し回答を取得（時間順）
    const { data: responses, error: responsesError } = await adminSupabase
      .from("responses")
      .select("id, participant_id, answered_at, points_awarded, is_correct")
      .eq("question_id", questionId)
      .eq("answer", "早押し回答")
      .order("answered_at", { ascending: true })

    if (responsesError) {
      console.error("Error fetching responses:", responsesError)
      // データが見つからない場合は空配列を返す
      if (responsesError.code === "PGRST116") {
        return NextResponse.json({ data: [] })
      }
      return NextResponse.json({ error: responsesError.message }, { status: 500 })
    }

    console.log("Found responses:", responses?.length || 0)

    if (!responses || responses.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // 参加者情報を取得
    const participantIds = [...new Set(responses.map((r) => r.participant_id))]
    const { data: participants, error: participantsError } = await adminSupabase
      .from("participants")
      .select("id, name")
      .in("id", participantIds)

    if (participantsError) {
      console.error("Error fetching participants:", participantsError)
      // 参加者情報が取得できない場合でも、IDだけで表示
      const quickResponseData = responses.map((response, index) => ({
        id: response.id,
        participant_id: response.participant_id,
        participant_name: `参加者 ${response.participant_id}`,
        responded_at: response.answered_at,
        points_awarded: response.points_awarded || 0,
        is_correct: response.is_correct || false,
      }))
      return NextResponse.json({ data: quickResponseData })
    }

    // データを結合
    const participantMap = new Map(participants?.map((p) => [p.id, p.name]) || [])

    const quickResponseData = responses.map((response) => ({
      id: response.id,
      participant_id: response.participant_id,
      participant_name: participantMap.get(response.participant_id) || `参加者 ${response.participant_id}`,
      responded_at: response.answered_at,
      points_awarded: response.points_awarded || 0,
      is_correct: response.is_correct || false,
    }))

    console.log("Processed quick response data:", quickResponseData.length, "items")

    return NextResponse.json({
      data: quickResponseData,
      success: true,
    })
  } catch (error) {
    console.error("Error in quick-response-order API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get("questionId")

    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    console.log("Resetting quick responses for question:", questionId)

    // 早押し回答を削除
    const { error } = await adminSupabase
      .from("responses")
      .delete()
      .eq("question_id", questionId)
      .eq("answer", "早押し回答")

    if (error) {
      console.error("Error deleting quick responses:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Quick responses reset successfully")

    return NextResponse.json({
      success: true,
      message: "早押し回答をリセットしました",
    })
  } catch (error) {
    console.error("Error resetting quick responses:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
