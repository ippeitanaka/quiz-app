import { type NextRequest, NextResponse } from "next/server"
import { adminSupabase } from "@/lib/supabase/supabase"
import type { ScoreboardEntryRecord, ScoreboardEventType, ScoreboardRecord } from "@/lib/scoreboard"

type EntryScoreSnapshot = {
  id: string
  score: number
}

type AdminAction =
  | { action: "load" }
  | { action: "refresh"; scoreboardId: string }
  | { action: "saveTitle"; scoreboardId: string; title: string }
  | { action: "setMode"; scoreboardId: string; mode: "individual" | "group" }
  | {
      action: "addEntry"
      scoreboardId: string
      name: string
      entryType: "individual" | "group"
      colorIndex: number
      sortOrder: number
    }
  | { action: "renameEntry"; scoreboardId: string; entryId: string; name: string }
  | {
      action: "setScore"
      scoreboardId: string
      entryId: string
      score: number
      eventType: ScoreboardEventType
      previousScore: number
      challengeValue?: number | null
    }
  | { action: "deleteEntry"; scoreboardId: string; entryId: string }
  | { action: "resetScores"; scoreboardId: string; entries: EntryScoreSnapshot[] }

async function requireUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!token) {
    return { error: NextResponse.json({ error: "管理者セッションがありません" }, { status: 401 }) }
  }

  const { data, error } = await adminSupabase.auth.getUser(token)
  if (error || !data.user) {
    return { error: NextResponse.json({ error: "管理者認証に失敗しました" }, { status: 401 }) }
  }

  return { user: data.user }
}

async function fetchBoard(scoreboardId: string) {
  const { data: board, error: boardError } = await adminSupabase
    .from("scoreboards")
    .select("*")
    .eq("id", scoreboardId)
    .single()

  if (boardError) throw boardError

  const { data: entries, error: entriesError } = await adminSupabase
    .from("scoreboard_entries")
    .select("*")
    .eq("scoreboard_id", scoreboardId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (entriesError) throw entriesError

  return {
    board: board as ScoreboardRecord,
    entries: (entries || []) as ScoreboardEntryRecord[],
  }
}

async function assertBoardOwner(scoreboardId: string, adminId: string) {
  const { data, error } = await adminSupabase
    .from("scoreboards")
    .select("id")
    .eq("id", scoreboardId)
    .eq("admin_id", adminId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error("このスコアボードを操作する権限がありません")
  }
}

async function touchBoard(scoreboardId: string) {
  const { error } = await adminSupabase
    .from("scoreboards")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", scoreboardId)

  if (error) throw error
}

async function insertScoreEvent(input: {
  scoreboardId: string
  entryId: string | null
  eventType: ScoreboardEventType
  previousScore: number
  newScore: number
  challengeValue?: number | null
}) {
  const { error } = await adminSupabase.from("scoreboard_events").insert({
    scoreboard_id: input.scoreboardId,
    entry_id: input.entryId,
    event_type: input.eventType,
    delta: input.newScore - input.previousScore,
    previous_score: input.previousScore,
    new_score: input.newScore,
    challenge_value: input.challengeValue ?? null,
  })

  if (error) {
    console.error("Failed to save scoreboard event:", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth.error) return auth.error

    const body = (await request.json()) as AdminAction
    const adminId = auth.user.id

    if (body.action === "load") {
      let { data: existingBoard, error: findError } = await adminSupabase
        .from("scoreboards")
        .select("*")
        .eq("admin_id", adminId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (findError) throw findError

      if (!existingBoard) {
        const { data: createdBoard, error: createError } = await adminSupabase
          .from("scoreboards")
          .insert({
            admin_id: adminId,
            title: "スコアボード",
            mode: "individual",
            is_public: true,
            is_active: true,
          })
          .select("*")
          .single()

        if (createError) throw createError
        existingBoard = createdBoard
      }

      const result = await fetchBoard(existingBoard.id)
      return NextResponse.json(result)
    }

    if (!("scoreboardId" in body) || !body.scoreboardId) {
      return NextResponse.json({ error: "scoreboardId が必要です" }, { status: 400 })
    }

    await assertBoardOwner(body.scoreboardId, adminId)

    switch (body.action) {
      case "refresh": {
        return NextResponse.json(await fetchBoard(body.scoreboardId))
      }

      case "saveTitle": {
        const { error } = await adminSupabase
          .from("scoreboards")
          .update({ title: body.title, updated_at: new Date().toISOString() })
          .eq("id", body.scoreboardId)

        if (error) throw error
        return NextResponse.json(await fetchBoard(body.scoreboardId))
      }

      case "setMode": {
        const { error } = await adminSupabase
          .from("scoreboards")
          .update({ mode: body.mode, updated_at: new Date().toISOString() })
          .eq("id", body.scoreboardId)

        if (error) throw error
        return NextResponse.json(await fetchBoard(body.scoreboardId))
      }

      case "addEntry": {
        const { error } = await adminSupabase.from("scoreboard_entries").insert({
          scoreboard_id: body.scoreboardId,
          name: body.name,
          entry_type: body.entryType,
          score: 0,
          color_index: body.colorIndex,
          sort_order: body.sortOrder,
        })

        if (error) throw error
        await touchBoard(body.scoreboardId)
        return NextResponse.json(await fetchBoard(body.scoreboardId))
      }

      case "renameEntry": {
        const { error } = await adminSupabase
          .from("scoreboard_entries")
          .update({ name: body.name })
          .eq("id", body.entryId)
          .eq("scoreboard_id", body.scoreboardId)

        if (error) throw error
        await touchBoard(body.scoreboardId)
        return NextResponse.json(await fetchBoard(body.scoreboardId))
      }

      case "setScore": {
        const score = Number.isFinite(body.score) ? Math.trunc(body.score) : 0
        const { error } = await adminSupabase
          .from("scoreboard_entries")
          .update({ score })
          .eq("id", body.entryId)
          .eq("scoreboard_id", body.scoreboardId)

        if (error) throw error
  await touchBoard(body.scoreboardId)

        await insertScoreEvent({
          scoreboardId: body.scoreboardId,
          entryId: body.entryId,
          eventType: body.eventType,
          previousScore: body.previousScore,
          newScore: score,
          challengeValue: body.challengeValue,
        })

        return NextResponse.json(await fetchBoard(body.scoreboardId))
      }

      case "deleteEntry": {
        const { error } = await adminSupabase
          .from("scoreboard_entries")
          .delete()
          .eq("id", body.entryId)
          .eq("scoreboard_id", body.scoreboardId)

        if (error) throw error
        await touchBoard(body.scoreboardId)
        return NextResponse.json(await fetchBoard(body.scoreboardId))
      }

      case "resetScores": {
        const { error } = await adminSupabase
          .from("scoreboard_entries")
          .update({ score: 0 })
          .eq("scoreboard_id", body.scoreboardId)

        if (error) throw error
  await touchBoard(body.scoreboardId)

        const events = body.entries
          .filter((entry) => Number(entry.score) !== 0)
          .map((entry) => ({
            scoreboard_id: body.scoreboardId,
            entry_id: entry.id,
            event_type: "reset",
            delta: -entry.score,
            previous_score: entry.score,
            new_score: 0,
            challenge_value: null,
          }))

        if (events.length) {
          const { error: eventError } = await adminSupabase.from("scoreboard_events").insert(events)
          if (eventError) console.error("Failed to save reset events:", eventError)
        }

        return NextResponse.json(await fetchBoard(body.scoreboardId))
      }

      default:
        return NextResponse.json({ error: "未対応の操作です" }, { status: 400 })
    }
  } catch (error) {
    console.error("Scoreboard admin API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "スコアボード保存に失敗しました" },
      { status: 500 },
    )
  }
}