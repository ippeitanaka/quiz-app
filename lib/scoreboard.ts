export type ScoreboardRecord = {
  id: string
  admin_id: string
  title: string
  description: string | null
  mode: "individual" | "group"
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ScoreboardEntryRecord = {
  id: string
  scoreboard_id: string
  name: string
  entry_type: "individual" | "group"
  score: number
  color_index: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type ScoreboardEventType = "manual" | "quick_add" | "quick_subtract" | "challenge" | "reset"

export type ScoreboardPlayer = {
  id: string
  name: string
  score: number
  colorIndex: number
  sortOrder: number
}

export type ScoreboardState = {
  id: string | null
  title: string
  players: ScoreboardPlayer[]
  updatedAt: number
}

export const SCOREBOARD_COLORS = [
  { background: "#e5f0e8", border: "#6fa085", accent: "#1f5a46", text: "#173f32" },
  { background: "#f8edcf", border: "#d2aa4c", accent: "#8a6b24", text: "#5d4717" },
  { background: "#e5eef6", border: "#7197b7", accent: "#315f7d", text: "#23465d" },
  { background: "#f5e5df", border: "#c98c79", accent: "#8e4f3d", text: "#67392d" },
  { background: "#ede7f5", border: "#9d89bc", accent: "#6a558c", text: "#4f4069" },
  { background: "#e4f1f0", border: "#69a4a0", accent: "#2e6f6b", text: "#235552" },
  { background: "#f5e7ed", border: "#c786a2", accent: "#8a4965", text: "#66364b" },
  { background: "#eef1df", border: "#99a963", accent: "#657536", text: "#4b5728" },
  { background: "#f0e8dc", border: "#b19167", accent: "#7c5c34", text: "#5d4528" },
  { background: "#e4ebf0", border: "#7b91a3", accent: "#4d6678", text: "#3a4d5b" },
  { background: "#f2e8dc", border: "#c09a6a", accent: "#8b6536", text: "#664b29" },
  { background: "#e9eee6", border: "#869c7d", accent: "#536b4a", text: "#3e5038" },
] as const

export const DEFAULT_SCOREBOARD_STATE: ScoreboardState = {
  id: null,
  title: "スコアボード",
  players: [],
  updatedAt: 0,
}

export function entryToPlayer(entry: ScoreboardEntryRecord): ScoreboardPlayer {
  return {
    id: entry.id,
    name: entry.name,
    score: Number(entry.score) || 0,
    colorIndex: Number(entry.color_index) || 0,
    sortOrder: Number(entry.sort_order) || 0,
  }
}

export function scoreboardToState(board: ScoreboardRecord, entries: ScoreboardEntryRecord[]): ScoreboardState {
  return {
    id: board.id,
    title: board.title || "スコアボード",
    players: [...entries]
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .map(entryToPlayer),
    updatedAt: Date.parse(board.updated_at) || Date.now(),
  }
}

export function drawChallengePoints() {
  // -30〜+30の整数。0付近ほど出やすく、両端ほど出にくい重み付き抽選。
  const weightedValues: Array<{ value: number; weight: number }> = []
  let totalWeight = 0

  for (let value = -30; value <= 30; value += 1) {
    const weight = 10 + (30 - Math.abs(value))
    weightedValues.push({ value, weight })
    totalWeight += weight
  }

  let cursor = Math.random() * totalWeight
  for (const item of weightedValues) {
    cursor -= item.weight
    if (cursor <= 0) return item.value
  }

  return 0
}
