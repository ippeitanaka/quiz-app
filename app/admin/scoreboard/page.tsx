"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Cloud,
  CloudOff,
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
import { supabase } from "@/lib/supabase/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_SCOREBOARD_STATE,
  SCOREBOARD_COLORS,
  drawChallengePoints,
  scoreboardToState,
  type ScoreboardEntryRecord,
  type ScoreboardEventType,
  type ScoreboardPlayer,
  type ScoreboardRecord,
  type ScoreboardState,
} from "@/lib/scoreboard"

type ChallengeResult = {
  name: string
  points: number
} | null

type RealtimeStatus = "connecting" | "connected" | "disconnected"

export default function ScoreboardAdminPage() {
  const { user, signOut, isLoading } = useAuth()
  const router = useRouter()
  const [boardRecord, setBoardRecord] = useState<ScoreboardRecord | null>(null)
  const [board, setBoard] = useState<ScoreboardState>(DEFAULT_SCOREBOARD_STATE)
  const [newName, setNewName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [challengeResult, setChallengeResult] = useState<ChallengeResult>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting")
  const scoreBeforeEdit = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!isLoading && !user) router.replace("/admin/login")
  }, [isLoading, user, router])

  const fetchEntries = useCallback(async (scoreboardId: string) => {
    const { data, error: entriesError } = await supabase
      .from("scoreboard_entries")
      .select("*")
      .eq("scoreboard_id", scoreboardId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (entriesError) throw entriesError
    return (data || []) as ScoreboardEntryRecord[]
  }, [])

  const refreshBoard = useCallback(async (scoreboardId: string) => {
    const { data: freshBoard, error: boardError } = await supabase
      .from("scoreboards")
      .select("*")
      .eq("id", scoreboardId)
      .single()

    if (boardError) throw boardError

    const entries = await fetchEntries(scoreboardId)
    const typedBoard = freshBoard as ScoreboardRecord
    setBoardRecord(typedBoard)
    setBoard(scoreboardToState(typedBoard, entries))
  }, [fetchEntries])

  const initializeBoard = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError("")

    try {
      let { data: existingBoard, error: findError } = await supabase
        .from("scoreboards")
        .select("*")
        .eq("admin_id", user.id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (findError) throw findError

      if (!existingBoard) {
        const { data: createdBoard, error: createError } = await supabase
          .from("scoreboards")
          .insert({
            admin_id: user.id,
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

      const typedBoard = existingBoard as ScoreboardRecord
      const entries = await fetchEntries(typedBoard.id)
      setBoardRecord(typedBoard)
      setBoard(scoreboardToState(typedBoard, entries))
    } catch (err) {
      console.error("Failed to initialize scoreboard:", err)
      setError(err instanceof Error ? err.message : "スコアボードの読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }, [fetchEntries, user])

  useEffect(() => {
    if (!isLoading && user) initializeBoard()
  }, [initializeBoard, isLoading, user])

  useEffect(() => {
    const scoreboardId = boardRecord?.id
    if (!scoreboardId) return

    setRealtimeStatus("connecting")

    const sync = () => {
      refreshBoard(scoreboardId).catch((err) => console.error("Realtime refresh failed:", err))
    }

    const channel = supabase
      .channel(`scoreboard-admin-${scoreboardId}`)
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

    // Realtimeが一時的に切れても端末間同期を復旧できる保険。
    const fallback = window.setInterval(sync, 10000)

    return () => {
      window.clearInterval(fallback)
      supabase.removeChannel(channel)
    }
  }, [boardRecord?.id, refreshBoard])

  const rankedIds = useMemo(
    () => [...board.players].sort((a, b) => b.score - a.score).map((player) => player.id),
    [board.players],
  )

  const displayUrl = boardRecord ? `/scoreboard/display?id=${encodeURIComponent(boardRecord.id)}` : "/scoreboard/display"

  const patchLocalPlayer = (id: string, patch: Partial<ScoreboardPlayer>) => {
    setBoard((current) => ({
      ...current,
      players: current.players.map((player) => (player.id === id ? { ...player, ...patch } : player)),
      updatedAt: Date.now(),
    }))
  }

  const insertEvent = async (
    playerId: string | null,
    eventType: ScoreboardEventType,
    previousScore: number,
    newScore: number,
    challengeValue?: number,
  ) => {
    if (!boardRecord) return

    const { error: eventError } = await supabase.from("scoreboard_events").insert({
      scoreboard_id: boardRecord.id,
      entry_id: playerId,
      event_type: eventType,
      delta: newScore - previousScore,
      previous_score: previousScore,
      new_score: newScore,
      challenge_value: challengeValue ?? null,
    })

    if (eventError) console.error("Failed to save scoreboard event:", eventError)
  }

  const saveTitle = async () => {
    if (!boardRecord) return
    const title = board.title.trim() || "スコアボード"
    setBoard((current) => ({ ...current, title }))
    setSaving("title")
    setError("")

    const { error: updateError } = await supabase.from("scoreboards").update({ title }).eq("id", boardRecord.id)
    if (updateError) {
      setError(`タイトルを保存できませんでした: ${updateError.message}`)
      await refreshBoard(boardRecord.id)
    }
    setSaving(null)
  }

  const setMode = async (mode: "individual" | "group") => {
    if (!boardRecord || boardRecord.mode === mode) return
    setBoardRecord({ ...boardRecord, mode })
    const { error: updateError } = await supabase.from("scoreboards").update({ mode }).eq("id", boardRecord.id)
    if (updateError) {
      setError(`モードを変更できませんでした: ${updateError.message}`)
      await refreshBoard(boardRecord.id)
    }
  }

  const nextColorIndex = () => {
    const used = new Set(board.players.map((player) => player.colorIndex % SCOREBOARD_COLORS.length))
    for (let index = 0; index < SCOREBOARD_COLORS.length; index += 1) {
      if (!used.has(index)) return index
    }
    return board.players.length % SCOREBOARD_COLORS.length
  }

  const addPlayer = async () => {
    if (!boardRecord || saving === "add") return

    const fallbackNumber = board.players.length + 1
    const name = newName.trim() || `${boardRecord.mode === "group" ? "グループ" : "参加者"} ${fallbackNumber}`
    const sortOrder = board.players.length ? Math.max(...board.players.map((player) => player.sortOrder)) + 1 : 0

    setSaving("add")
    setError("")

    const { error: insertError } = await supabase.from("scoreboard_entries").insert({
      scoreboard_id: boardRecord.id,
      name,
      entry_type: boardRecord.mode,
      score: 0,
      color_index: nextColorIndex(),
      sort_order: sortOrder,
    })

    if (insertError) {
      setError(insertError.message.includes("duplicate") ? "同じ名前は登録できません。別の名前を入力してください。" : insertError.message)
    } else {
      setNewName("")
      await refreshBoard(boardRecord.id)
    }

    setSaving(null)
  }

  const savePlayerName = async (player: ScoreboardPlayer) => {
    if (!boardRecord) return
    const name = player.name.trim() || "名称未設定"
    patchLocalPlayer(player.id, { name })
    setSaving(`name-${player.id}`)
    setError("")

    const { error: updateError } = await supabase.from("scoreboard_entries").update({ name }).eq("id", player.id)
    if (updateError) {
      setError(updateError.message.includes("duplicate") ? "同じ名前は登録できません。" : updateError.message)
      await refreshBoard(boardRecord.id)
    }
    setSaving(null)
  }

  const persistScore = async (
    player: ScoreboardPlayer,
    newScore: number,
    eventType: ScoreboardEventType,
    previousScore = player.score,
    challengeValue?: number,
  ) => {
    if (!boardRecord) return
    const normalizedScore = Number.isFinite(newScore) ? Math.trunc(newScore) : 0
    patchLocalPlayer(player.id, { score: normalizedScore })
    setSaving(`score-${player.id}`)
    setError("")

    const { error: updateError } = await supabase
      .from("scoreboard_entries")
      .update({ score: normalizedScore })
      .eq("id", player.id)
      .eq("scoreboard_id", boardRecord.id)

    if (updateError) {
      setError(`得点を保存できませんでした: ${updateError.message}`)
      await refreshBoard(boardRecord.id)
    } else {
      await insertEvent(player.id, eventType, previousScore, normalizedScore, challengeValue)
    }

    setSaving(null)
  }

  const adjustScore = async (player: ScoreboardPlayer, amount: number) => {
    const eventType: ScoreboardEventType = amount >= 0 ? "quick_add" : "quick_subtract"
    await persistScore(player, player.score + amount, eventType, player.score)
  }

  const deletePlayer = async (player: ScoreboardPlayer) => {
    if (!boardRecord || !window.confirm(`${player.name}をスコアボードから削除しますか？`)) return
    setSaving(`delete-${player.id}`)
    const { error: deleteError } = await supabase
      .from("scoreboard_entries")
      .delete()
      .eq("id", player.id)
      .eq("scoreboard_id", boardRecord.id)

    if (deleteError) setError(`削除できませんでした: ${deleteError.message}`)
    else await refreshBoard(boardRecord.id)
    setSaving(null)
  }

  const challenge = async (player: ScoreboardPlayer) => {
    const points = drawChallengePoints()
    await persistScore(player, player.score + points, "challenge", player.score, points)
    setChallengeResult({ name: player.name, points })
  }

  const resetScores = async () => {
    if (!boardRecord || !board.players.length || !window.confirm("全員の得点を0点に戻しますか？")) return
    setSaving("reset")
    setError("")

    const previousPlayers = [...board.players]
    setBoard((current) => ({
      ...current,
      players: current.players.map((player) => ({ ...player, score: 0 })),
      updatedAt: Date.now(),
    }))

    const { error: updateError } = await supabase
      .from("scoreboard_entries")
      .update({ score: 0 })
      .eq("scoreboard_id", boardRecord.id)

    if (updateError) {
      setError(`リセットできませんでした: ${updateError.message}`)
      await refreshBoard(boardRecord.id)
    } else {
      const events = previousPlayers.map((player) => ({
        scoreboard_id: boardRecord.id,
        entry_id: player.id,
        event_type: "reset",
        delta: -player.score,
        previous_score: player.score,
        new_score: 0,
        challenge_value: null,
      }))
      if (events.length) {
        const { error: eventError } = await supabase.from("scoreboard_events").insert(events)
        if (eventError) console.error("Failed to save reset events:", eventError)
      }
    }

    setSaving(null)
  }

  if (isLoading || !user || loading) {
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
                  <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${realtimeStatus === "connected" ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-100" : "border-amber-200/20 bg-amber-300/10 text-amber-100"}`}>
                    {realtimeStatus === "connected" ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
                    {realtimeStatus === "connected" ? "REALTIME SYNC" : "CONNECTING"}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">スコアボード</h1>
                <p className="mt-1 text-sm text-white/65">Supabaseで保存し、別PC・タブレット・表示画面へリアルタイム同期します。</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="brand-header-button">
                <Link href="/admin/dashboard"><ArrowLeft className="h-4 w-4" />ダッシュボード</Link>
              </Button>
              <Button asChild className="h-11 rounded-xl bg-[#f2d17d] font-bold text-[#173f32] hover:bg-[#f6dda0]">
                <a href={displayUrl} target="_blank" rel="noreferrer"><MonitorUp className="h-4 w-4" />表示モード<ExternalLink className="h-3.5 w-3.5" /></a>
              </Button>
              <Button variant="outline" onClick={() => signOut()} className="brand-header-button"><LogOut className="h-4 w-4" />ログアウト</Button>
            </div>
          </div>
        </header>

        <div className="brand-content space-y-7">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
          )}

          <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr_0.6fr]">
            <div className="brand-panel p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="board-title" className="brand-label">ボードタイトル</label>
                <div className="flex rounded-xl border border-[#d7dfd4] bg-[#f7f8f2] p-1 text-xs font-bold">
                  <button type="button" onClick={() => setMode("individual")} className={`rounded-lg px-3 py-1.5 transition ${boardRecord?.mode === "individual" ? "bg-[#1f5a46] text-white shadow-sm" : "text-[#64756c]"}`}>個人戦</button>
                  <button type="button" onClick={() => setMode("group")} className={`rounded-lg px-3 py-1.5 transition ${boardRecord?.mode === "group" ? "bg-[#1f5a46] text-white shadow-sm" : "text-[#64756c]"}`}>グループ戦</button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="board-title"
                  value={board.title}
                  onChange={(event) => setBoard((current) => ({ ...current, title: event.target.value }))}
                  onBlur={saveTitle}
                  className="h-12 text-lg font-bold"
                  placeholder="例：救急クイズ大会 決勝"
                />
                <div className="hidden items-center gap-2 text-xs font-bold text-[#718078] sm:flex">
                  {saving === "title" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  DB保存
                </div>
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
                <h2 className="mt-1 text-xl font-bold text-[#193c31]">{boardRecord?.mode === "group" ? "グループ" : "参加者"}を追加</h2>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") addPlayer() }}
                    placeholder={boardRecord?.mode === "group" ? "例：Aチーム" : "例：田中さん"}
                    className="h-12 sm:max-w-md"
                  />
                  <Button onClick={addPlayer} disabled={saving === "add"} className="h-12 rounded-xl bg-[#1f5a46] px-6 font-bold text-white hover:bg-[#184b3a]">
                    {saving === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}追加する
                  </Button>
                </div>
              </div>
              <Button variant="outline" onClick={resetScores} disabled={!board.players.length || saving === "reset"} className="h-11 rounded-xl">
                {saving === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}全員0点に戻す
              </Button>
            </div>
          </section>

          {board.players.length === 0 ? (
            <section className="rounded-3xl border border-dashed border-emerald-950/15 bg-white/55 px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e4efe8] text-[#245845]"><UserPlus className="h-7 w-7" /></div>
              <h2 className="mt-5 text-xl font-bold text-[#193c31]">参加者を追加するとスコアカードが表示されます</h2>
              <p className="mt-2 text-sm text-[#718078]">追加順に背景色を自動で振り分け、別端末の表示画面にも同期します。</p>
            </section>
          ) : (
            <section className="grid gap-5 xl:grid-cols-2">
              {board.players.map((player) => {
                const palette = SCOREBOARD_COLORS[player.colorIndex % SCOREBOARD_COLORS.length]
                const rank = rankedIds.indexOf(player.id) + 1
                const isPlayerSaving = saving?.endsWith(player.id)
                return (
                  <article
                    key={player.id}
                    className="overflow-hidden rounded-[1.75rem] border-2 shadow-[0_16px_38px_rgba(38,69,52,0.10)]"
                    style={{ backgroundColor: palette.background, borderColor: palette.border }}
                  >
                    <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: `${palette.border}66` }}>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white shadow-sm" style={{ backgroundColor: palette.accent }}>{rank}</div>
                        <Input
                          value={player.name}
                          onChange={(event) => patchLocalPlayer(player.id, { name: event.target.value })}
                          onBlur={() => savePlayerName(player)}
                          className="h-11 border-white/70 bg-white/65 text-lg font-bold"
                          aria-label="参加者名"
                        />
                        {isPlayerSaving && <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deletePlayer(player)} className="h-10 w-10 shrink-0 rounded-xl text-red-600 hover:bg-white/70 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </div>

                    <div className="grid gap-5 p-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                      <div className="rounded-2xl border border-white/65 bg-white/60 p-4 text-center shadow-sm">
                        <p className="text-xs font-bold tracking-[0.16em]" style={{ color: palette.accent }}>SCORE</p>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={player.score}
                          onFocus={() => { scoreBeforeEdit.current[player.id] = player.score }}
                          onChange={(event) => patchLocalPlayer(player.id, { score: Number(event.target.value) || 0 })}
                          onBlur={() => persistScore(player, player.score, "manual", scoreBeforeEdit.current[player.id] ?? player.score)}
                          className="mt-2 h-20 border-0 bg-transparent text-center text-5xl font-black shadow-none focus-visible:ring-0"
                          style={{ color: palette.text }}
                          aria-label={`${player.name}の得点`}
                        />
                        <p className="text-xs font-bold" style={{ color: palette.accent }}>POINTS</p>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          {[-10, -5, 5, 10].map((amount) => (
                            <Button key={amount} variant="outline" onClick={() => adjustScore(player, amount)} className="h-11 rounded-xl border-white/70 bg-white/65 font-black hover:bg-white">
                              {amount < 0 ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{Math.abs(amount)}
                            </Button>
                          ))}
                        </div>
                        <Button
                          onClick={() => challenge(player)}
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
            <p className="mt-2 text-sm font-bold text-[#718078]">点をスコアに反映し、全端末へ同期しました</p>
            <Button onClick={() => setChallengeResult(null)} className="mt-7 h-12 w-full rounded-xl bg-[#1f5a46] font-bold text-white hover:bg-[#184b3a]">OK</Button>
          </div>
        </div>
      )}
    </main>
  )
}
