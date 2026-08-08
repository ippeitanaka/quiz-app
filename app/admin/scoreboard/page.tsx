"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Dice5,
  ExternalLink,
  Loader2,
  LogOut,
  Minus,
  MonitorUp,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_SCOREBOARD_STATE,
  SCOREBOARD_COLORS,
  createScoreboardPlayer,
  drawChallengePoints,
  loadScoreboardState,
  saveScoreboardState,
  type ScoreboardState,
} from "@/lib/scoreboard"

type ChallengeResult = {
  name: string
  points: number
} | null

export default function ScoreboardAdminPage() {
  const { user, signOut, isLoading } = useAuth()
  const router = useRouter()
  const [board, setBoard] = useState<ScoreboardState>(DEFAULT_SCOREBOARD_STATE)
  const [newName, setNewName] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [challengeResult, setChallengeResult] = useState<ChallengeResult>(null)

  useEffect(() => {
    if (!isLoading && !user) router.replace("/admin/login")
  }, [isLoading, user, router])

  useEffect(() => {
    setBoard(loadScoreboardState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveScoreboardState(board)
  }, [board, hydrated])

  const rankedIds = useMemo(
    () => [...board.players].sort((a, b) => b.score - a.score).map((player) => player.id),
    [board.players],
  )

  const commit = (updater: (current: ScoreboardState) => ScoreboardState) => {
    setBoard((current) => ({ ...updater(current), updatedAt: Date.now() }))
  }

  const addPlayer = () => {
    const name = newName.trim() || `参加者 ${board.players.length + 1}`
    commit((current) => ({
      ...current,
      players: [...current.players, createScoreboardPlayer(name, current.players.length)],
    }))
    setNewName("")
  }

  const updatePlayer = (id: string, patch: { name?: string; score?: number }) => {
    commit((current) => ({
      ...current,
      players: current.players.map((player) => (player.id === id ? { ...player, ...patch } : player)),
    }))
  }

  const adjustScore = (id: string, amount: number) => {
    commit((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === id ? { ...player, score: player.score + amount } : player,
      ),
    }))
  }

  const deletePlayer = (id: string, name: string) => {
    if (!window.confirm(`${name}をスコアボードから削除しますか？`)) return
    commit((current) => ({ ...current, players: current.players.filter((player) => player.id !== id) }))
  }

  const challenge = (id: string, name: string) => {
    const points = drawChallengePoints()
    adjustScore(id, points)
    setChallengeResult({ name, points })
  }

  const resetScores = () => {
    if (!window.confirm("全員の得点を0点に戻しますか？")) return
    commit((current) => ({
      ...current,
      players: current.players.map((player) => ({ ...player, score: 0 })),
    }))
  }

  if (isLoading || !user || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="brand-loading"><Loader2 className="h-4 w-4 animate-spin" />スコアボードを読み込んでいます</div>
      </div>
    )
  }

  return (
    <main className="brand-page">
      <div className="brand-shell max-w-[1500px]">
        <header className="brand-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="brand-logo-frame"><img src="/icon.png" alt="Quiz App" /></div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="brand-kicker">ANALOG QUIZ MODE</span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white/70">AUTO SAVE</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">スコアボード</h1>
                <p className="mt-1 text-sm text-white/65">アナログで進行するクイズの得点だけを、シンプルに管理します。</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="brand-header-button">
                <Link href="/admin/dashboard"><ArrowLeft className="h-4 w-4" />ダッシュボード</Link>
              </Button>
              <Button asChild className="h-11 rounded-xl bg-[#f2d17d] font-bold text-[#173f32] hover:bg-[#f6dda0]">
                <a href="/scoreboard/display" target="_blank" rel="noreferrer"><MonitorUp className="h-4 w-4" />表示モード<ExternalLink className="h-3.5 w-3.5" /></a>
              </Button>
              <Button variant="outline" onClick={() => signOut()} className="brand-header-button"><LogOut className="h-4 w-4" />ログアウト</Button>
            </div>
          </div>
        </header>

        <div className="brand-content space-y-7">
          <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr_0.6fr]">
            <div className="brand-panel p-5 sm:p-6">
              <label htmlFor="board-title" className="brand-label">ボードタイトル</label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="board-title"
                  value={board.title}
                  onChange={(event) => commit((current) => ({ ...current, title: event.target.value }))}
                  className="h-12 text-lg font-bold"
                  placeholder="例：救急クイズ大会 決勝"
                />
                <div className="hidden items-center gap-2 text-xs font-bold text-[#718078] sm:flex"><Save className="h-4 w-4" />自動保存</div>
              </div>
            </div>

            <div className="brand-panel flex items-center justify-between p-5 sm:p-6">
              <div><p className="brand-label">参加者 / グループ</p><p className="mt-2 text-4xl font-black text-[#193c31]">{board.players.length}</p></div>
              <div className="rounded-2xl bg-[#e4efe8] p-3 text-[#245845]"><Users className="h-7 w-7" /></div>
            </div>

            <div className="brand-panel flex items-center justify-between p-5 sm:p-6">
              <div><p className="brand-label">トップスコア</p><p className="mt-2 text-4xl font-black text-[#193c31]">{board.players.length ? Math.max(...board.players.map((p) => p.score)) : 0}</p></div>
              <div className="rounded-2xl bg-[#f7eccb] p-3 text-[#8a6b24]"><Trophy className="h-7 w-7" /></div>
            </div>
          </section>

          <section className="brand-panel p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1">
                <p className="brand-kicker !text-[#6d806f]">ENTRY MANAGEMENT</p>
                <h2 className="mt-1 text-xl font-bold text-[#193c31]">参加者・グループを追加</h2>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") addPlayer() }}
                    placeholder="例：Aチーム / 田中さん"
                    className="h-12 sm:max-w-md"
                  />
                  <Button onClick={addPlayer} className="h-12 rounded-xl bg-[#1f5a46] px-6 font-bold text-white hover:bg-[#184b3a]"><UserPlus className="h-4 w-4" />追加する</Button>
                </div>
              </div>
              <Button variant="outline" onClick={resetScores} disabled={!board.players.length} className="h-11 rounded-xl"><RotateCcw className="h-4 w-4" />全員0点に戻す</Button>
            </div>
          </section>

          {board.players.length === 0 ? (
            <section className="rounded-3xl border border-dashed border-emerald-950/15 bg-white/55 px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e4efe8] text-[#245845]"><UserPlus className="h-7 w-7" /></div>
              <h2 className="mt-5 text-xl font-bold text-[#193c31]">参加者を追加するとスコアカードが表示されます</h2>
              <p className="mt-2 text-sm text-[#718078]">個人でもチームでもOK。追加順に背景色を自動で振り分けます。</p>
            </section>
          ) : (
            <section className="grid gap-5 xl:grid-cols-2">
              {board.players.map((player) => {
                const palette = SCOREBOARD_COLORS[player.colorIndex % SCOREBOARD_COLORS.length]
                const rank = rankedIds.indexOf(player.id) + 1
                return (
                  <article
                    key={player.id}
                    className="overflow-hidden rounded-[1.75rem] border-2 shadow-[0_16px_38px_rgba(38,69,52,0.10)]"
                    style={{ backgroundColor: palette.background, borderColor: palette.border }}
                  >
                    <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: `${palette.border}66` }}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white shadow-sm" style={{ backgroundColor: palette.accent }}>{rank}</div>
                        <Input
                          value={player.name}
                          onChange={(event) => updatePlayer(player.id, { name: event.target.value })}
                          className="h-11 border-white/70 bg-white/65 text-lg font-bold"
                          aria-label="参加者名"
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deletePlayer(player.id, player.name)} className="h-10 w-10 shrink-0 rounded-xl text-red-600 hover:bg-white/70 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </div>

                    <div className="grid gap-5 p-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                      <div className="rounded-2xl border border-white/65 bg-white/60 p-4 text-center shadow-sm">
                        <p className="text-xs font-bold tracking-[0.16em]" style={{ color: palette.accent }}>SCORE</p>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={player.score}
                          onChange={(event) => updatePlayer(player.id, { score: Number(event.target.value) || 0 })}
                          className="mt-2 h-20 border-0 bg-transparent text-center text-5xl font-black shadow-none focus-visible:ring-0"
                          style={{ color: palette.text }}
                          aria-label={`${player.name}の得点`}
                        />
                        <p className="text-xs font-bold" style={{ color: palette.accent }}>POINTS</p>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          {[-10, -5, 5, 10].map((amount) => (
                            <Button key={amount} variant="outline" onClick={() => adjustScore(player.id, amount)} className="h-11 rounded-xl border-white/70 bg-white/65 font-black hover:bg-white">
                              {amount < 0 ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{Math.abs(amount)}
                            </Button>
                          ))}
                        </div>
                        <Button
                          onClick={() => challenge(player.id, player.name)}
                          className="h-14 w-full rounded-2xl font-black text-white shadow-[0_10px_22px_rgba(23,63,50,0.18)]"
                          style={{ backgroundColor: palette.accent }}
                        >
                          <Dice5 className="h-5 w-5" />チャレンジ
                          <span className="text-xs font-bold opacity-75">-30〜+30</span>
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          )}
        </div>
      </div>

      {challengeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102b22]/70 p-5 backdrop-blur-sm" onClick={() => setChallengeResult(null)}>
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/25 bg-[#fffdf5] p-8 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="icon" className="absolute right-4 top-4 rounded-full" onClick={() => setChallengeResult(null)}><X className="h-5 w-5" /></Button>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#173f32,#2f6e56)] text-white shadow-xl"><Dice5 className="h-10 w-10" /></div>
            <p className="mt-6 text-sm font-bold tracking-[0.18em] text-[#78877f]">CHALLENGE RESULT</p>
            <h3 className="mt-2 text-xl font-bold text-[#193c31]">{challengeResult.name}</h3>
            <p className={`mt-4 text-7xl font-black tracking-tight ${challengeResult.points >= 0 ? "text-[#1f6c50]" : "text-[#b24b42]"}`}>
              {challengeResult.points > 0 ? "+" : ""}{challengeResult.points}
            </p>
            <p className="mt-2 text-sm font-bold text-[#718078]">点をスコアに反映しました</p>
            <Button onClick={() => setChallengeResult(null)} className="mt-7 h-12 w-full rounded-xl bg-[#1f5a46] font-bold text-white hover:bg-[#184b3a]">OK</Button>
          </div>
        </div>
      )}
    </main>
  )
}
