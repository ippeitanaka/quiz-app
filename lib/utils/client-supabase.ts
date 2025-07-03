import { createClient } from "@supabase/supabase-js"

// クライアントサイドでSupabaseに直接接続するためのヘルパー関数
export function createClientSupabase(url?: string, key?: string) {
  // 環境変数から取得
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 引数またはローカルストレージから取得
  const customUrl = url || getLocalStorageItem("supabaseUrl")
  const customKey = key || getLocalStorageItem("supabaseAnonKey")

  // 優先順位: 引数 > ローカルストレージ > 環境変数
  const finalUrl = customUrl || envUrl || ""
  const finalKey = customKey || envKey || ""

  if (!finalUrl || !finalKey) {
    console.error("Supabase credentials not found")
    return null
  }

  try {
    return createClient(finalUrl, finalKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  } catch (error) {
    console.error("Failed to create Supabase client:", error)
    return null
  }
}

// ローカルストレージからアイテムを安全に取得
function getLocalStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.error(`Failed to get ${key} from localStorage:`, error)
    return null
  }
}

// ローカルストレージにアイテムを安全に保存
export function setLocalStorageItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error(`Failed to set ${key} in localStorage:`, error)
    return false
  }
}

// クイズコードからクイズ情報を直接取得
export async function getQuizByCode(code: string) {
  const supabase = createClientSupabase()
  if (!supabase) {
    return { data: null, error: "Supabase client not initialized" }
  }

  try {
    const { data, error } = await supabase.from("quizzes").select("*").eq("code", code).single()

    if (error) {
      console.error("Error fetching quiz:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Exception fetching quiz:", error)
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// 参加者を直接作成
export async function createParticipant(quizId: string, name: string) {
  const supabase = createClientSupabase()
  if (!supabase) {
    return { data: null, error: "Supabase client not initialized" }
  }

  try {
    const { data, error } = await supabase
      .from("participants")
      .insert([{ quiz_id: quizId, name, score: 0 }])
      .select()
      .single()

    if (error) {
      console.error("Error creating participant:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Exception creating participant:", error)
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// 名前が既に使用されているか確認
export async function checkNameExists(quizId: string, name: string) {
  const supabase = createClientSupabase()
  if (!supabase) {
    return { exists: false, error: "Supabase client not initialized" }
  }

  try {
    const { data, error } = await supabase
      .from("participants")
      .select("id")
      .eq("quiz_id", quizId)
      .eq("name", name)
      .maybeSingle()

    if (error) {
      console.error("Error checking name:", error)
      return { exists: false, error: error.message }
    }

    return { exists: !!data, error: null }
  } catch (error) {
    console.error("Exception checking name:", error)
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
