import { NextResponse } from "next/server"
import { testSupabaseConnection } from "@/lib/supabase/supabase"

export async function GET() {
  try {
    console.log("API: Testing Supabase connection...")

    // 環境変数の確認
    const envCheck = {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    console.log("Environment variables check:", envCheck)

    // 接続テストを実行
    const result = await testSupabaseConnection()

    return NextResponse.json({
      ...result,
      environment: envCheck,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Test connection API error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Connection test failed",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        environment: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
      { status: 500 },
    )
  }
}
