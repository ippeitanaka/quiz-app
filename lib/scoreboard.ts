export type ScoreboardPlayer = {
  id: string
  name: string
  score: number
  colorIndex: number
}

export type ScoreboardState = {
  title: string
  players: ScoreboardPlayer[]
  updatedAt: number
}

export const SCOREBOARD_STORAGE_KEY = "tmc-quiz-scoreboard-v1"

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
  title: "スコアボード",
  players: [],
  updatedAt: 0,
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `score-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createScoreboardPlayer(name: string, colorIndex: number): ScoreboardPlayer {
  return {
    id: createId(),
    name,
    score: 0,
    colorIndex: colorIndex % SCOREBOARD_COLORS.length,
  }
}

export function loadScoreboardState(): ScoreboardState {
  if (typeof window === "undefined") return DEFAULT_SCOREBOARD_STATE

  try {
    const raw = window.localStorage.getItem(SCOREBOARD_STORAGE_KEY)
    if (!raw) return DEFAULT_SCOREBOARD_STATE

    const parsed = JSON.parse(raw) as Partial<ScoreboardState>
    const players = Array.isArray(parsed.players)
      ? parsed.players
          .filter((player): player is ScoreboardPlayer => Boolean(player && typeof player.id === "string"))
          .map((player, index) => ({
            id: player.id,
            name: typeof player.name === "string" && player.name.trim() ? player.name : `参加者 ${index + 1}`,
            score: Number.isFinite(Number(player.score)) ? Number(player.score) : 0,
            colorIndex: Number.isInteger(player.colorIndex) ? player.colorIndex % SCOREBOARD_COLORS.length : index % SCOREBOARD_COLORS.length,
          }))
      : []

    return {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : "スコアボード",
      players,
      updatedAt: Number(parsed.updatedAt) || 0,
    }
  } catch (error) {
    console.error("Failed to load scoreboard:", error)
    return DEFAULT_SCOREBOARD_STATE
  }
}

export function saveScoreboardState(state: ScoreboardState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SCOREBOARD_STORAGE_KEY, JSON.stringify(state))
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
