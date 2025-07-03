import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quizId, name } = body

    console.log("API: Creating participant:", { quizId, name })

    if (!quizId || !name) {
      return NextResponse.json(
        {
          success: false,
          error: "クイズIDと名前が必要です",
        },
        { status: 400 },
      )
    }

    // 名前の長さチェック
    if (name.length > 20) {
      return NextResponse.json(
        {
          success: false,
          error: "名前は20文字以内で入力してください",
        },
        { status: 400 },
      )
    }

    // 環境変数の確認
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("Environment check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: "サーバー設定エラー",
        },
        { status: 500 },
      )
    }

    // Supabaseクライアントを作成
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // クイズが存在し、アクティブかチェック
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id, is_active, title")
      .eq("id", quizId)
      .single()

    console.log("Quiz check result:", { quiz, quizError })

    if (quizError || !quiz) {
      console.error("Quiz not found:", quizError)
      return NextResponse.json(
        {
          success: false,
          error: "クイズが見つかりません",
        },
        { status: 404 },
      )
    }

    if (!quiz.is_active) {
      console.log("Quiz is not active:", quiz.is_active)
      return NextResponse.json(
        {
          success: false,
          error: "このクイズは現在アクティブではありません",
        },
        { status: 400 },
      )
    }

    // 名前の重複チェック
    const { data: existingParticipant, error: checkError } = await supabase
      .from("participants")
      .select("id")
      .eq("quiz_id", quizId)
      .eq("name", name)
      .maybeSingle()

    console.log("Name check result:", { existingParticipant, checkError })

    if (checkError) {
      console.error("Error checking existing participant:", checkError)
      return NextResponse.json(
        {
          success: false,
          error: "参加者の確認中にエラーが発生しました",
        },
        { status: 500 },
      )
    }

    if (existingParticipant) {
      return NextResponse.json(
        {
          success: false,
          error: "この名前はすでに使用されています",
        },
        { status: 409 },
      )
    }

    // 参加者を作成
    const { data: participant, error: createError } = await supabase
      .from("participants")
      .insert([
        {
          quiz_id: quizId,
          name: name.trim(),
          score: 0,
        },
      ])
      .select()
      .single()

    console.log("Participant creation result:", { participant, createError })

    if (createError || !participant) {
      console.error("Error creating participant:", createError)
      return NextResponse.json(
        {
          success: false,
          error: "参加者の作成中にエラーが発生しました",
          details: createError?.message,
        },
        { status: 500 },
      )
    }

    console.log("Participant created successfully:", participant.id)

    return NextResponse.json({
      success: true,
      data: participant,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "サーバーエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
