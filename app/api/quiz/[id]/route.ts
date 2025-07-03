import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// 管理者権限でSupabaseクライアントを作成
const createAdminSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL or service role key is missing")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// GET: クイズの詳細情報を取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`Fetching quiz with ID: ${params.id}`)
    const quizId = params.id

    const adminSupabase = createAdminSupabaseClient()

    // クイズの基本情報を取得
    const { data: quiz, error: quizError } = await adminSupabase.from("quizzes").select("*").eq("id", quizId).single()

    if (quizError) {
      console.error("Error fetching quiz:", quizError)
      return NextResponse.json({ error: "クイズが見つかりません", details: quizError }, { status: 404 })
    }

    // 関連する問題を取得
    const { data: questions, error: questionsError } = await adminSupabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("created_at", { ascending: true })

    if (questionsError) {
      console.error("Error fetching questions:", questionsError)
      return NextResponse.json(
        { error: "問題の取得中にエラーが発生しました", details: questionsError },
        { status: 500 },
      )
    }

    // 参加者数を取得
    const { count: participantCount, error: participantError } = await adminSupabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quizId)

    if (participantError) {
      console.error("Error counting participants:", participantError)
    }

    const result = {
      ...quiz,
      questions: questions || [],
      participant_count: participantCount || 0,
    }

    console.log("Quiz fetched successfully:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in GET quiz:", error)
    return NextResponse.json({ error: "クイズの取得中にエラーが発生しました", details: error }, { status: 500 })
  }
}

// DELETE: クイズとその関連データを削除
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`Deleting quiz with ID: ${params.id}`)
    const quizId = params.id

    // 管理者権限でSupabaseクライアントを作成
    const adminSupabase = createAdminSupabaseClient()

    // まず、このクイズの参加者IDを取得
    const { data: participants, error: participantsSelectError } = await adminSupabase
      .from("participants")
      .select("id")
      .eq("quiz_id", quizId)

    if (participantsSelectError) {
      console.error("Error selecting participants:", participantsSelectError)
      return NextResponse.json(
        { error: "参加者の取得中にエラーが発生しました", details: participantsSelectError },
        { status: 500 },
      )
    }

    const participantIds = participants?.map((p) => p.id) || []
    console.log(`Found ${participantIds.length} participants to delete responses for`)

    // 1. 参加者に関連する回答を削除
    if (participantIds.length > 0) {
      const { error: responsesError } = await adminSupabase
        .from("responses")
        .delete()
        .in("participant_id", participantIds)

      if (responsesError) {
        console.error("Error deleting responses:", responsesError)
        return NextResponse.json(
          { error: "回答の削除中にエラーが発生しました", details: responsesError },
          { status: 500 },
        )
      }
      console.log("Responses deleted successfully")
    }

    // 2. アクティブな問題を削除
    const { error: activeQuestionsError } = await adminSupabase.from("active_questions").delete().eq("quiz_id", quizId)

    if (activeQuestionsError) {
      console.error("Error deleting active questions:", activeQuestionsError)
      return NextResponse.json(
        { error: "アクティブな問題の削除中にエラーが発生しました", details: activeQuestionsError },
        { status: 500 },
      )
    }
    console.log("Active questions deleted successfully")

    // 3. 参加者を削除
    const { error: participantsError } = await adminSupabase.from("participants").delete().eq("quiz_id", quizId)
    if (participantsError) {
      console.error("Error deleting participants:", participantsError)
      return NextResponse.json(
        { error: "参加者の削除中にエラーが発生しました", details: participantsError },
        { status: 500 },
      )
    }
    console.log("Participants deleted successfully")

    // 4. チームを削除（テーブルが存在する場合）
    try {
      const { error: teamsError } = await adminSupabase.from("teams").delete().eq("quiz_id", quizId)
      if (teamsError && !teamsError.message.includes("does not exist")) {
        console.error("Error deleting teams:", teamsError)
        return NextResponse.json(
          { error: "チームの削除中にエラーが発生しました", details: teamsError },
          { status: 500 },
        )
      }
      console.log("Teams deleted successfully (or table does not exist)")
    } catch (error) {
      console.log("Teams table does not exist, skipping...")
    }

    // 5. メディアを削除（テーブルが存在する場合）
    try {
      // まず、このクイズの問題IDを取得
      const { data: questions, error: questionsSelectError } = await adminSupabase
        .from("questions")
        .select("id")
        .eq("quiz_id", quizId)

      if (!questionsSelectError && questions && questions.length > 0) {
        const questionIds = questions.map((q) => q.id)
        const { error: mediaError } = await adminSupabase.from("media").delete().in("question_id", questionIds)
        if (mediaError && !mediaError.message.includes("does not exist")) {
          console.error("Error deleting media:", mediaError)
        } else {
          console.log("Media deleted successfully (or table does not exist)")
        }
      }
    } catch (error) {
      console.log("Media table does not exist, skipping...")
    }

    // 6. 問題を削除
    const { error: questionsError } = await adminSupabase.from("questions").delete().eq("quiz_id", quizId)
    if (questionsError) {
      console.error("Error deleting questions:", questionsError)
      return NextResponse.json(
        { error: "問題の削除中にエラーが発生しました", details: questionsError },
        { status: 500 },
      )
    }
    console.log("Questions deleted successfully")

    // 7. 最後にクイズ自体を削除
    const { error: quizError, data: deletedQuiz } = await adminSupabase
      .from("quizzes")
      .delete()
      .eq("id", quizId)
      .select()
      .single()

    if (quizError) {
      console.error("Error deleting quiz:", quizError)
      return NextResponse.json({ error: "クイズの削除中にエラーが発生しました", details: quizError }, { status: 500 })
    }

    console.log("Quiz and all related data deleted successfully:", deletedQuiz)
    return NextResponse.json({ success: true, message: "クイズが削除されました", data: deletedQuiz })
  } catch (error) {
    console.error("Error in DELETE quiz:", error)
    return NextResponse.json({ error: "クイズの削除中にエラーが発生しました", details: error }, { status: 500 })
  }
}

// PUT: クイズの情報を更新
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`Updating quiz with ID: ${params.id}`)
    const quizId = params.id
    const body = await request.json()

    const adminSupabase = createAdminSupabaseClient()

    const { data: updatedQuiz, error: updateError } = await adminSupabase
      .from("quizzes")
      .update({
        title: body.title,
        description: body.description,
        is_active: body.is_active,
      })
      .eq("id", quizId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating quiz:", updateError)
      return NextResponse.json({ error: "クイズの更新中にエラーが発生しました", details: updateError }, { status: 500 })
    }

    console.log("Quiz updated successfully:", updatedQuiz)
    return NextResponse.json({ success: true, data: updatedQuiz })
  } catch (error) {
    console.error("Error in PUT quiz:", error)
    return NextResponse.json({ error: "クイズの更新中にエラーが発生しました", details: error }, { status: 500 })
  }
}
