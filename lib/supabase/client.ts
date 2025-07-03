import { createClient } from "@supabase/supabase-js"

// Function to get Supabase URL and key with localStorage fallback
function getSupabaseCredentials() {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== "undefined"

  // Get from localStorage if available (browser only)
  const localUrl = isBrowser ? localStorage.getItem("supabase_url") : null
  const localKey = isBrowser ? localStorage.getItem("supabase_anon_key") : null

  // Use localStorage values if available, otherwise use environment variables
  const url = localUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const key = localKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  return { url, key }
}

// Create and export the Supabase client
export function createSupabaseClient() {
  const { url, key } = getSupabaseCredentials()

  // Validate URL and key
  if (!url || !key) {
    console.error("Supabase URL or key is missing")
    throw new Error("Supabase configuration is missing")
  }

  try {
    return createClient(url, key)
  } catch (error) {
    console.error("Failed to create Supabase client:", error)
    throw error
  }
}

// Create the client
export const supabaseClient = typeof window !== "undefined" ? createSupabaseClient() : null
