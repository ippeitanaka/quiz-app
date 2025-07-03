import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const { url, key } = await request.json()

    if (!url || !key) {
      return NextResponse.json(
        {
          success: false,
          message: "URL and key are required",
        },
        { status: 400 },
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid URL format",
          error: "The provided URL is not valid",
        },
        { status: 400 },
      )
    }

    // Create a test client
    let client
    try {
      client = createClient(url, key)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create Supabase client",
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }

    // Test the connection
    const { data, error } = await client.from("quizzes").select("count").limit(1)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Connection test failed",
          error: error.message,
          details: error,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      data,
    })
  } catch (error) {
    console.error("Test connection error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Connection test failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
