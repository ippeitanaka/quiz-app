import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const participantId = params.id

    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 })
    }

    console.log(`Deleting participant with ID: ${participantId}`)

    // まず、参加者の回答を削除
    const { error: responsesError, data: responsesData } = await adminSupabase
      .from("responses")
      .delete()
      .eq("participant_id", participantId)
      .select()

    console.log("Deleted responses:", responsesData || "none", responsesError || "no error")

    if (responsesError) {
      console.error("Error deleting responses:", responsesError)
      return NextResponse.json(
        {
          error: "Failed to delete participant responses",
          details: responsesError.message,
        },
        { status: 500 },
      )
    }

    // 次に、参加者を削除
    const { error, data: deletedData } = await adminSupabase
      .from("participants")
      .delete()
      .eq("id", participantId)
      .select()

    console.log("Deleted participant:", deletedData || "none", error || "no error")

    if (error) {
      console.error("Error deleting participant:", error)
      return NextResponse.json(
        {
          error: "Failed to delete participant",
          details: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Participant and their responses deleted successfully",
      deletedParticipant: deletedData,
      deletedResponses: responsesData,
    })
  } catch (error) {
    console.error("Error in delete participant API:", error)
    return NextResponse.json(
      {
        error: "Failed to delete participant",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
