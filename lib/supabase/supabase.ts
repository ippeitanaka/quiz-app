import { createClient } from "@supabase/supabase-js"

// 環境変数の取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// デバッグ用ログ（開発環境のみ）
if (process.env.NODE_ENV === "development") {
  console.log("Supabase Environment Check:", {
    url_exists: !!supabaseUrl,
    anon_key_exists: !!supabaseAnonKey,
    service_key_exists: !!serviceRoleKey,
  })
}

// URL形式の検証
function isValidSupabaseUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes("supabase.co") || urlObj.hostname.includes("localhost")
  } catch {
    return false
  }
}

// フォールバック値（本番環境では使用されない）
const fallbackUrl = "https://placeholder.supabase.co"
const fallbackKey = "placeholder-key"

// Supabaseクライアントの作成
export const supabase = (() => {
  try {
    // 環境変数が設定されていない場合はフォールバック値を使用
    const url = supabaseUrl || fallbackUrl
    const key = supabaseAnonKey || fallbackKey

    // 環境変数が設定されていない場合は警告（開発環境のみ）
    if ((!supabaseUrl || !supabaseAnonKey) && process.env.NODE_ENV === "development") {
      console.warn("Using fallback Supabase configuration - this will not work for actual operations")
    }

    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch (error) {
    console.error("Failed to create Supabase client:", error)

    // エラー時は最小限のモックオブジェクトを返す
    return {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        insert: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        update: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        delete: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
          maybeSingle: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as any
  }
})()

// Admin client（サーバーサイド用）
export const adminSupabase = (() => {
  try {
    const url = supabaseUrl || fallbackUrl
    const key = serviceRoleKey || supabaseAnonKey || fallbackKey

    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  } catch (error) {
    console.error("Failed to create Admin Supabase client:", error)
    return supabase // フォールバックとして通常のクライアントを使用
  }
})()

// 接続テスト関数
export async function testSupabaseConnection() {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("Testing Supabase connection...")
    }

    // 環境変数が設定されていない場合
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        message: "Supabase environment variables not configured",
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
        details: {
          url_exists: !!supabaseUrl,
          key_exists: !!supabaseAnonKey,
        },
      }
    }

    // 接続テスト
    const { data, error } = await supabase.from("quizzes").select("count").limit(1)

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Supabase connection error:", error)
      }

      return {
        success: false,
        message: "Supabase connection failed",
        error: error.message,
        details: error,
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Supabase connection successful")
    }

    return {
      success: true,
      message: "Supabase connection successful",
      data,
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Supabase connection test exception:", error)
    }

    return {
      success: false,
      message: "Supabase connection test failed",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }
  }
}
