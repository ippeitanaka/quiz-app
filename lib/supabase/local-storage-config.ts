// ローカルストレージからSupabase設定を読み込む
export function loadSupabaseConfig() {
  if (typeof window === "undefined") {
    return { url: null, anonKey: null }
  }

  try {
    const url = localStorage.getItem("supabaseUrl")
    const anonKey = localStorage.getItem("supabaseAnonKey")
    return { url, anonKey }
  } catch (error) {
    console.error("Failed to load Supabase config from localStorage:", error)
    return { url: null, anonKey: null }
  }
}

// ローカルストレージにSupabase設定を保存
export function saveSupabaseConfig(url: string, anonKey: string) {
  if (typeof window === "undefined") {
    return false
  }

  try {
    localStorage.setItem("supabaseUrl", url)
    localStorage.setItem("supabaseAnonKey", anonKey)
    return true
  } catch (error) {
    console.error("Failed to save Supabase config to localStorage:", error)
    return false
  }
}

// Supabase設定が存在するかチェック
export function hasSupabaseConfig() {
  const { url, anonKey } = loadSupabaseConfig()
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return !!(url || envUrl) && !!(anonKey || envKey)
}

// 設定をクリア
export function clearSupabaseConfig() {
  if (typeof window === "undefined") {
    return false
  }

  try {
    localStorage.removeItem("supabaseUrl")
    localStorage.removeItem("supabaseAnonKey")
    return true
  } catch (error) {
    console.error("Failed to clear Supabase config from localStorage:", error)
    return false
  }
}
