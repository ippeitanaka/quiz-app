"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Settings, RefreshCw } from "lucide-react"

interface SupabaseConfigCheckProps {
  children: React.ReactNode
  redirectTo?: string
  returnPath?: string
}

export function SupabaseConfigCheck({ children, redirectTo = "/config", returnPath }: SupabaseConfigCheckProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // 現在のパスを取得
  const currentPath = typeof window !== "undefined" ? window.location.pathname : ""

  // リダイレクト先のURLを構築
  const redirectUrl = returnPath
    ? `${redirectTo}?redirectTo=${encodeURIComponent(returnPath)}&returnText=戻る`
    : `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}&returnText=戻る`

  useEffect(() => {
    const checkConfig = async () => {
      setIsChecking(true)
      setError(null)

      try {
        // 環境変数の存在確認
        const hasEnvUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
        const hasEnvKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        // 環境変数が設定されている場合は設定済みとみなす
        if (hasEnvUrl && hasEnvKey) {
          setIsConfigured(true)
          setIsChecking(false)
          return
        }

        // ローカルストレージの確認
        const hasLocalUrl = !!(typeof window !== "undefined" && localStorage.getItem("supabaseUrl"))
        const hasLocalKey = !!(typeof window !== "undefined" && localStorage.getItem("supabaseAnonKey"))

        if (hasLocalUrl && hasLocalKey) {
          setIsConfigured(true)
          setIsChecking(false)
          return
        }

        // どちらも設定されていない場合
        setIsConfigured(false)
      } catch (error) {
        console.error("Config check error:", error)
        setError(error instanceof Error ? error.message : "設定確認中にエラーが発生しました")
        setIsConfigured(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkConfig()
  }, [])

  // 設定が必要な場合は設定ページにリダイレクト
  const redirectToConfig = () => {
    router.push(redirectUrl)
  }

  // 再チェック
  const recheckConfig = () => {
    setIsChecking(true)
    setIsConfigured(null)
    setError(null)
    window.location.reload()
  }

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-center text-muted-foreground">設定を確認中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">設定確認エラー</h3>
        <p className="text-center text-red-700 mb-4">{error}</p>
        <div className="flex space-x-2">
          <Button onClick={redirectToConfig}>
            <Settings className="h-4 w-4 mr-2" />
            設定ページへ
          </Button>
          <Button variant="outline" onClick={recheckConfig}>
            <RefreshCw className="h-4 w-4 mr-2" />
            再確認
          </Button>
        </div>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="text-lg font-medium text-amber-800 mb-2">Supabase設定が必要です</h3>
        <p className="text-center text-amber-700 mb-4">
          管理者機能を使用するには、Supabaseの接続情報を設定する必要があります。
        </p>
        <div className="flex space-x-2">
          <Button onClick={redirectToConfig}>
            <Settings className="h-4 w-4 mr-2" />
            設定ページへ
          </Button>
          <Button variant="outline" onClick={recheckConfig}>
            <RefreshCw className="h-4 w-4 mr-2" />
            再確認
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
