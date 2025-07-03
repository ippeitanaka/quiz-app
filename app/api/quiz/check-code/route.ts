import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    console.log("API: Checking quiz with code:", code)

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "クイズコードが指定されていません",
        },
        { status: 400 },
      )
    }

    // 環境変数の確認（Next.jsのサーバーサイドでの読み込み）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log("Environment check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey,
      url: supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "undefined",
      nodeEnv: process.env.NODE_ENV,
    })

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase URL が設定されていません",
          details: "NEXT_PUBLIC_SUPABASE_URL environment variable is missing",
        },
        { status: 500 },
      )
    }

    // サービスロールキーがない場合はAnon Keyを使用
    const supabaseKey = supabaseServiceKey || supabaseAnonKey

    if (!supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase認証キーが設定されていません",
          details: "Both SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing",
        },
        { status: 500 },
      )
    }

    console.log("Using key type:", supabaseServiceKey ? "service_role" : "anon")

    // Supabaseクライアントを作成
    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("Supabase client created, querying for code:", code)

    // クイズを検索
    const { data, error } = await supabase.from("quizzes").select("*").eq("code", code).maybeSingle()

    console.log("Query result:", {
      hasData: !!data,
      error: error?.message,
      dataId: data?.id,
      dataTitle: data?.title,
      dataIsActive: data?.is_active,
    })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "データベースエラーが発生しました",
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (!data) {
      console.log("No quiz found with code:", code)
      return NextResponse.json(
        {
          success: false,
          error: "指定されたコードのクイズが見つかりませんでした",
        },
        { status: 404 },
      )
    }

    console.log("Quiz found successfully:", { id: data.id, title: data.title, is_active: data.is_active })

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        title: data.title,
        code: data.code,
        is_active: data.is_active,
        created_by: data.created_by,
        description: data.description,
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "サーバーエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
