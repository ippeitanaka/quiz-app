import { createClient } from "@supabase/supabase-js"

// 環境変数の取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let browserClientCache: {
  url: string
  key: string
  client: ReturnType<typeof createClient>
} | null = null

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

function createMisconfiguredClient(reason: string) {
  const error = new Error(reason)

  return {
    from: () => ({
      select: () => Promise.resolve({ data: null, error }),
      insert: () => Promise.resolve({ data: null, error }),
      update: () => Promise.resolve({ data: null, error }),
      delete: () => Promise.resolve({ data: null, error }),
      eq: () => ({
        single: () => Promise.resolve({ data: null, error }),
        maybeSingle: () => Promise.resolve({ data: null, error }),
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error }),
      signOut: () => Promise.resolve({ error }),
    },
  } as any
}

function loadBrowserCredentials() {
  if (typeof window === "undefined") return { url: null, key: null }

  try {
    return {
      url: localStorage.getItem("supabaseUrl"),
      key: localStorage.getItem("supabaseAnonKey"),
    }
  } catch (error) {
    console.error("Failed to load Supabase credentials from localStorage:", error)
    return { url: null, key: null }
  }
}

function resolvePublicCredentials() {
  const browserCredentials = loadBrowserCredentials()
  // Prefer deployment-wide environment variables so every device connected to the
  // same app URL resolves the same Supabase project. Browser-local overrides are
  // kept only as a fallback for local/dev setups without env vars.
  const resolvedUrl = supabaseUrl || browserCredentials.url
  const resolvedKey = supabaseAnonKey || browserCredentials.key

  if (!resolvedUrl || !resolvedKey) {
    return { error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" }
  }

  if (!isValidSupabaseUrl(resolvedUrl) || resolvedUrl.includes("placeholder.supabase.co")) {
    return { error: `Invalid NEXT_PUBLIC_SUPABASE_URL: ${resolvedUrl}` }
  }

  return { url: resolvedUrl, key: resolvedKey }
}

function createPublicClient(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

function getPublicClient() {
  const resolved = resolvePublicCredentials()
  if ("error" in resolved) {
    if (process.env.NODE_ENV === "development") {
      console.error(resolved.error)
    }
    return createMisconfiguredClient(resolved.error)
  }

  if (typeof window === "undefined") {
    return createPublicClient(resolved.url, resolved.key)
  }

  if (
    browserClientCache &&
    browserClientCache.url === resolved.url &&
    browserClientCache.key === resolved.key
  ) {
    return browserClientCache.client
  }

  const client = createPublicClient(resolved.url, resolved.key)
  browserClientCache = { url: resolved.url, key: resolved.key, client }
  return client
}

// Supabaseクライアントの作成
export const supabase = new Proxy(
  {},
  {
    get(_target, property) {
      try {
        const client = getPublicClient() as any
        const value = client[property]
        return typeof value === "function" ? value.bind(client) : value
      } catch (error) {
        console.error("Failed to access Supabase client:", error)
        const fallback = createMisconfiguredClient(
          error instanceof Error ? error.message : "Supabase not configured",
        ) as any
        const value = fallback[property]
        return typeof value === "function" ? value.bind(fallback) : value
      }
    },
  },
) as any

// Admin client（サーバーサイド用）
export const adminSupabase = (() => {
  try {
    const resolved = resolvePublicCredentials()
    if ("error" in resolved) {
      if (process.env.NODE_ENV === "development") {
        console.error(resolved.error)
      }
      return createMisconfiguredClient(resolved.error)
    }

    const key = serviceRoleKey || resolved.key

    return createClient(resolved.url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  } catch (error) {
    console.error("Failed to create Admin Supabase client:", error)
    return createMisconfiguredClient(error instanceof Error ? error.message : "Admin Supabase client init failed")
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
