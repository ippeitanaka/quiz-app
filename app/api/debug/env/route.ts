import { NextResponse } from "next/server"

export async function GET() {
  try {
    const envStatus = {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...`
          : "Not set",
        isValid: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? process.env.NEXT_PUBLIC_SUPABASE_URL.includes("supabase.co")
          : false,
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`
          : "Not set",
        isValid: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith("eyJ")
          : false,
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        value: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`
          : "Not set",
      },
      NEXT_PUBLIC_APP_URL: {
        exists: !!process.env.NEXT_PUBLIC_APP_URL,
        value: process.env.NEXT_PUBLIC_APP_URL || "Not set",
      },
    }

    return NextResponse.json({
      success: true,
      environment: envStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
