import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/supabase"

const TABLES = ["scoreboards", "scoreboard_entries", "scoreboard_events"] as const

export const dynamic = "force-dynamic"

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null

  try {
    return new URL(url).hostname.split(".")[0] || null
  } catch {
    return null
  }
}

export async function GET() {
  const checks = await Promise.all(
    TABLES.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })

      return {
        table,
        ok: !error,
        visibleRows: count ?? null,
        code: error?.code ?? null,
        message: error?.message ?? null,
      }
    }),
  )

  const ok = checks.every((check) => check.ok)

  return NextResponse.json(
    {
      ok,
      supabaseConfigured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      projectRef: getProjectRef(),
      checks,
      checkedAt: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  )
}
