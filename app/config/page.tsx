"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Database, ArrowLeft } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { saveSupabaseConfig, loadSupabaseConfig } from "@/lib/supabase/local-storage-config"
import Link from "next/link"

export default function ConfigPage() {
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // リダイレクト先（設定後に戻るURL）
  const redirectTo = searchParams.get("redirectTo") || "/"
  const returnText = searchParams.get("returnText") || "ホームに戻る"

  // 保存済みの設定を読み込む
  useEffect(() => {
    const { url, anonKey } = loadSupabaseConfig()

    // 環境変数からのフォールバック
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (url) setSupabaseUrl(url)
    else if (envUrl) setSupabaseUrl(envUrl)

    if (anonKey) setSupabaseKey(anonKey)
    else if (envKey) setSupabaseKey(envKey)
  }, [])

  // 設定を保存
  const saveConfig = () => {
    // ローカルストレージに保存
    saveSupabaseConfig(supabaseUrl, supabaseKey)

    // 成功メッセージを表示
    setTestResult({
      success: true,
      message: "設定を保存しました",
    })

    // 3秒後にリダイレクト
    setTimeout(() => {
      router.push(redirectTo)
    }, 3000)
  }

  // 接続テスト
  const testConnection = async () => {
    setLoading(true)
    setTestResult(null)

    try {
      // 一時的に設定を保存
      saveSupabaseConfig(supabaseUrl, supabaseKey)

      // 接続テスト
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: supabaseUrl,
          key: supabaseKey,
        }),
      })

      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({
        success: false,
        message: "接続テストに失敗しました",
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8 max-w-md">
      <h1 className="text-3xl font-bold mb-6">Supabase設定</h1>

      <Card>
        <CardHeader>
          <CardTitle>接続設定</CardTitle>
          <CardDescription>
            Supabaseの接続情報を入力してください。この設定はブラウザのローカルストレージに保存され、
            環境変数よりも優先されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="supabaseUrl" className="text-sm font-medium">
              Supabase URL
            </label>
            <Input
              id="supabaseUrl"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
            />
            <p className="text-xs text-muted-foreground">例: https://abcdefghijklm.supabase.co</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="supabaseKey" className="text-sm font-medium">
              Supabase Anon Key
            </label>
            <Input
              id="supabaseKey"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              Supabaseダッシュボードの「Project Settings」→「API」から取得できます
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href={redirectTo}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {returnText}
            </Link>
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={testConnection} disabled={loading}>
              <Database className="mr-2 h-4 w-4" />
              {loading ? "テスト中..." : "接続テスト"}
            </Button>
            <Button onClick={saveConfig} disabled={!supabaseUrl || !supabaseKey}>
              保存
            </Button>
          </div>
        </CardFooter>
      </Card>

      {testResult && (
        <Alert className={`mt-6 ${testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertTitle>{testResult.success ? "成功" : "エラー"}</AlertTitle>
          <AlertDescription>
            <p className={testResult.success ? "text-green-600" : "text-red-600"}>{testResult.message}</p>
            {testResult.error && <p className="text-sm text-red-500 mt-1">{testResult.error}</p>}
            {testResult.success && (
              <div className="mt-2">
                <p className="text-sm text-green-600">設定が保存されました。自動的にリダイレクトします...</p>
                <Button className="mt-2" size="sm" onClick={() => router.push(redirectTo)}>
                  今すぐ{returnText}
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
