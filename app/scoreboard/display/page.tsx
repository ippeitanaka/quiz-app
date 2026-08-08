"use client"

import { useEffect, useMemo, useState } from "react"
import { Trophy } from "lucide-react"
import {
  DEFAULT_SCOREBOARD_STATE,
  SCOREBOARD_COLORS,
  SCOREBOARD_STORAGE_KEY,
  loadScoreboardState,
  type ScoreboardState,
} from "@/lib/scoreboard"

export default function ScoreboardDisplayPage() {
  const [board, setBoard] = useState<ScoreboardState>(DEFAULT_SCOREBOARD_STATE)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setBoard(loadScoreboardState())
    setReady(true)

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SCOREBOARD_STORAGE_KEY) setBoard(loadScoreboardState())
    }

    window.addEventListener("storage", handleStorage)
    const interval = window.setInterval(() => setBoard(loadScoreboardState()), 1500)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.clearInterval(interval)
    }
  }, [])

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

  if (!ready) return <main className="min-h-screen bg-[#173f32]" />

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(90,151,116,0.30),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(240,207,119,0.22),transparent_34%),linear-gradient(145deg,#102c23_0%,#173f32_46%,#245845_100%)] px-4 py-5 text-white sm:px-7 sm:py-7 lg:px-10">
      <div className="mx-auto max-w-[1700px]">
        <header className="mb-7 flex items-center justify-between gap-5 border-b border-white/10 pb-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-xl"><img src="/icon.png" alt="Quiz App" className="h-full w-full object-contain drop-shadow-lg" /></div>
            <div className="min-w-0">
              <p className="text-[11px] font-black tracking-[0.24em] text-[#f2d17d]">LIVE SCOREBOARD</p>
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
            <div><Trophy className="mx-auto h-14 w-14 text-[#f2d17d]" /><p className="mt-5 text-2xl font-black">参加者を追加してください</p><p className="mt-2 text-sm font-bold text-white/50">運営用スコアボードで追加すると自動で反映されます。</p></div>
          </div>
        ) : (
          <section className={`grid gap-4 sm:gap-5 ${ranked.length <= 4 ? "md:grid-cols-2" : ranked.length <= 9 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-3 xl:grid-cols-4"}`}>
            {ranked.map((player) => {
              const palette = SCOREBOARD_COLORS[player.colorIndex % SCOREBOARD_COLORS.length]
              return (
                <article key={player.id} className="relative overflow-hidden rounded-[1.8rem] border-2 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)] sm:p-6" style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}>
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
