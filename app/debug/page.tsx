"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function DebugPage() {
  const [connectionResult, setConnectionResult] = useState<any>(null)
  const [envResult, setEnvResult] = useState<any>(null)
  const [quizCode, setQuizCode] = useState("1234")
  const [quizCheckResult, setQuizCheckResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkEnvironment = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/env")
      const data = await response.json()
      setEnvResult(data)
    } catch (error) {
      setEnvResult({
        success: false,
        error: "Failed to check environment",
        details: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/quiz/test-connection")
      const data = await response.json()
      setConnectionResult(data)
    } catch (error) {
      setConnectionResult({
        success: false,
        error: "Failed to test connection",
        details: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  const checkQuizCode = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/quiz/check-code?code=${quizCode}`)
      const data = await response.json()
      setQuizCheckResult({
        status: response.status,
        data,
      })
    } catch (error) {
      setQuizCheckResult({
        status: "error",
        data: {
          error: "Failed to check quiz code",
          details: error instanceof Error ? error.message : String(error),
        },
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkEnvironment()
    testConnection()
  }, [])

  const renderEnvStatus = (env: any) => {
    if (!env) return null

    return (
      <div className="space-y-2">
        {Object.entries(env).map(([key, value]: [string, any]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="font-mono text-sm">{key}:</span>
            <div className="flex items-center space-x-2">
              <Badge variant={value.exists ? "default" : "destructive"}>{value.exists ? "設定済み" : "未設定"}</Badge>
              {value.isValid !== undefined && (
                <Badge variant={value.isValid ? "default" : "secondary"}>{value.isValid ? "有効" : "無効"}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">デバッグページ</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>環境変数チェック</CardTitle>
            <CardDescription>必要な環境変数が正しく設定されているかチェックします</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={checkEnvironment} disabled={loading} className="mb-4">
              {loading ? "チェック中..." : "環境変数チェック"}
            </Button>

            {envResult && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">結果:</h3>
                {envResult.success ? (
                  <div className="space-y-4">
                    {renderEnvStatus(envResult.environment)}
                    <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                      {JSON.stringify(envResult, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <pre className="bg-red-50 p-4 rounded-md overflow-auto text-sm text-red-700">
                    {JSON.stringify(envResult, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>データベース接続テスト</CardTitle>
            <CardDescription>Supabaseへの接続をテストします</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testConnection} disabled={loading} className="mb-4">
              {loading ? "テスト中..." : "接続テスト"}
            </Button>

            {connectionResult && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">結果:</h3>
                <pre
                  className={`p-4 rounded-md overflow-auto text-sm ${
                    connectionResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {JSON.stringify(connectionResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>クイズコードチェック</CardTitle>
            <CardDescription>特定のクイズコードが存在するかチェックします</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                value={quizCode}
                onChange={(e) => setQuizCode(e.target.value)}
                placeholder="クイズコードを入力"
                className="max-w-xs"
              />
              <Button onClick={checkQuizCode} disabled={loading}>
                {loading ? "チェック中..." : "チェック"}
              </Button>
            </div>

            {quizCheckResult && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">結果:</h3>
                <pre
                  className={`p-4 rounded-md overflow-auto text-sm ${
                    quizCheckResult.status === 200 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {JSON.stringify(quizCheckResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
