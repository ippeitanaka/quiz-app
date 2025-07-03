import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: Request) {
  try {
    const { participantId, points } = await request.json()

    if (!participantId || points === undefined) {
      return NextResponse.json({ error: "Participant ID and points are required" }, { status: 400 })
    }

    // First, get current score
    const { data: participant, error: fetchError } = await adminSupabase
      .from("participants")
      .select("score")
      .eq("id", participantId)
      .single()

    if (fetchError) throw fetchError

    // Update with new score
    const newScore = (participant.score || 0) + points

    const { data, error } = await adminSupabase
      .from("participants")
      .update({
        score: newScore,
      })
      .eq("id", participantId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error awarding points:", error)
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 })
  }
}
