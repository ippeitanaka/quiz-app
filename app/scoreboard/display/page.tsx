"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Cloud, CloudOff, Loader2, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase/supabase"
import {
  DEFAULT_SCOREBOARD_STATE,
  SCOREBOARD_COLORS,
  scoreboardToState,
  type ScoreboardEntryRecord,
  type ScoreboardRecord,
  type ScoreboardState,
} from "@/lib/scoreboard"

type RealtimeStatus = "connecting" | "connected" | "disconnected"

export default function ScoreboardDisplayPage() {
  const [scoreboardId, setScoreboardId] = useState("")
  const [board, setBoard] = useState<ScoreboardState>(DEFAULT_SCOREBOARD_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") || ""
    setScoreboardId(id)
    if (!id) {
      setError("スコアボードIDがありません。運営画面の「表示モード」から開いてください。")
      setLoading(false)
    }
  }, [])

  const loadBoard = useCallback(async (id: string) => {
    if (!id) return

    const { data: boardData, error: boardError } = await supabase
      .from("scoreboards")
      .select("*")
      .eq("id", id)
      .eq("is_public", true)
      .maybeSingle()

    if (boardError) throw boardError
    if (!boardData) throw new Error("スコアボードが見つからないか、表示が公開されていません。")

    const { data: entryData, error: entriesError } = await supabase
      .from("scoreboard_entries")
      .select("*")
      .eq("scoreboard_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (entriesError) throw entriesError

    setBoard(scoreboardToState(boardData as ScoreboardRecord, (entryData || []) as ScoreboardEntryRecord[]))
    setError("")
  }, [])

  useEffect(() => {
    if (!scoreboardId) return

    let cancelled = false
    setLoading(true)

    loadBoard(scoreboardId)
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "スコアボードの読み込みに失敗しました")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    setRealtimeStatus("connecting")

    const sync = () => {
      loadBoard(scoreboardId).catch((err) => console.error("Live scoreboard refresh failed:", err))
    }

    const channel = supabase
      .channel(`scoreboard-display-${scoreboardId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scoreboards", filter: `id=eq.${scoreboardId}` },
        sync,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scoreboard_entries", filter: `scoreboard_id=eq.${scoreboardId}` },
        sync,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scoreboard_entries", filter: `scoreboard_id=eq.${scoreboardId}` },
        sync,
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "scoreboard_entries" }, sync)
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected")
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeStatus("disconnected")
        }
      })

    // ネットワーク復帰時やRealtime切断時にも自動で追いつく。
    const fallback = window.setInterval(sync, 10000)

    return () => {
      cancelled = true
      window.clearInterval(fallback)
      supabase.removeChannel(channel)
    }
  }, [loadBoard, scoreboardId])

  const ranked = useMemo(() => {
    const sorted = [...board.players].sort((a, b) => b.score - a.score)
    let previousScore: number | null = null
    let currentRank = 0

    return sorted.map((player, index) => {
      if (previousScore !== player.score) currentRank = index + 1
      previousScore = player.score
      return { ...player, rank: currentRank }
    })
  }, [board.players])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#173f32] text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold">
          <Loader2 className="h-5 w-5 animate-spin" />
          スコアボードを同期しています
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#173f32] px-6 text-white">
        <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center shadow-2xl">
          <CloudOff className="mx-auto h-12 w-12 text-[#f2d17d]" />
          <h1 className="mt-5 text-2xl font-black">スコアボードを表示できません</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-white/65">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(90,151,116,0.30),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(240,207,119,0.22),transparent_34%),linear-gradient(145deg,#102c23_0%,#173f32_46%,#245845_100%)] px-4 py-5 text-white sm:px-7 sm:py-7 lg:px-10">
      <div className="mx-auto max-w-[1700px]">
        <header className="mb-7 flex items-center justify-between gap-5 border-b border-white/10 pb-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-xl"><img src="/icon.png" alt="Quiz App" className="h-full w-full object-contain drop-shadow-lg" /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[11px] font-black tracking-[0.24em] text-[#f2d17d]">LIVE SCOREBOARD</p>
                <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wider ${realtimeStatus === "connected" ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-100" : "border-amber-200/20 bg-amber-300/10 text-amber-100"}`}>
                  {realtimeStatus === "connected" ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
                  {realtimeStatus === "connected" ? "LIVE" : "RECONNECTING"}
                </span>
              </div>
              <h1 className="mt-1 truncate text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{board.title}</h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 md:flex">
            <Trophy className="h-5 w-5 text-[#f2d17d]" />
            <div><p className="text-[10px] font-bold tracking-wider text-white/45">ENTRIES</p><p className="text-xl font-black">{board.players.length}</p></div>
          </div>
        </header>

        {ranked.length === 0 ? (
          <div className="flex min-h-[65vh] items-center justify-center rounded-[2rem] border border-dashed border-white/20 bg-white/5 text-center">
            <div><Trophy className="mx-auto h-14 w-14 text-[#f2d17d]" /><p className="mt-5 text-2xl font-black">参加者を追加してください</p><p className="mt-2 text-sm font-bold text-white/50">運営用スコアボードで追加すると、この端末にも自動で反映されます。</p></div>
          </div>
        ) : (
          <section className={`grid gap-4 sm:gap-5 ${ranked.length <= 4 ? "md:grid-cols-2" : ranked.length <= 9 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-3 xl:grid-cols-4"}`}>
            {ranked.map((player) => {
              const palette = SCOREBOARD_COLORS[player.colorIndex % SCOREBOARD_COLORS.length]
              return (
                <article key={player.id} className="relative overflow-hidden rounded-[1.8rem] border-2 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)] transition-all duration-300 sm:p-6" style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}>
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full opacity-15" style={{ backgroundColor: palette.accent }} />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black tracking-[0.2em] opacity-55">RANK {player.rank}</p>
                      <h2 className="mt-2 truncate text-2xl font-black sm:text-3xl">{player.name}</h2>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg" style={{ backgroundColor: palette.accent }}>{player.rank}</div>
                  </div>
                  <div className="relative mt-7 flex items-end justify-between gap-4">
                    <p className="text-[clamp(3.4rem,7vw,6.8rem)] font-black leading-none tracking-[-0.06em]">{player.score}</p>
                    <p className="mb-2 text-sm font-black tracking-[0.18em] opacity-55">POINTS</p>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
