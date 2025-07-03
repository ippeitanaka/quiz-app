import { NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"

export async function POST(request: Request) {
  try {
    const { title, description, adminId } = await request.json()

    if (!title || !adminId) {
      return NextResponse.json({ error: "Title and admin ID are required" }, { status: 400 })
    }

    // Generate a unique code
    const code = Math.floor(1000 + Math.random() * 9000).toString()

    // Create a new quiz using the service role client
    const { data, error } = await adminSupabase
      .from("quizzes")
      .insert({
        title,
        description,
        code,
        admin_id: adminId,
        is_active: false,
        created_at: new Date().toISOString(),
        time_limit_per_question: 30,
        theme_color: "pastel-blue",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error creating quiz:", error)
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 })
  }
}
