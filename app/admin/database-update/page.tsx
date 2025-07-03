"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Database, Copy, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function DatabaseUpdatePage() {
  const [copied, setCopied] = useState(false)
  const [updated, setUpdated] = useState(false)

  // 実行するSQL
  const sql = `
-- active_questionsテーブルにresults_revealedフィールドを追加
ALTER TABLE active_questions ADD COLUMN IF NOT EXISTS results_revealed BOOLEAN DEFAULT FALSE;
  `.trim()

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const markAsUpdated = () => {
    setUpdated(true)
    // ローカルストレージに更新済みフラグを保存
    localStorage.setItem("database_updated", "true")
  }

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">データベース更新</h1>

      <Alert className="mb-6 bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle>データベースの更新が必要です</AlertTitle>
        <AlertDescription>
          正解発表機能を使用するには、Supabaseダッシュボードで以下のSQLを実行する必要があります。
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>実行手順</CardTitle>
          <CardDescription>以下の手順に従ってデータベースを更新してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-4">
            <li>
              <a
                href="https://app.supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center"
              >
                Supabaseダッシュボード <ExternalLink className="h-4 w-4 ml-1" />
              </a>
              にログインします
            </li>
            <li>プロジェクトを選択します</li>
            <li>左側のメニューから「SQL Editor」を選択します</li>
            <li>「New Query」ボタンをクリックします</li>
            <li>以下のSQLをコピーして貼り付けます</li>
            <li>「Run」ボタンをクリックしてSQLを実行します</li>
          </ol>

          <div className="mt-4">
            <p className="font-medium mb-2">実行するSQL:</p>
            <div className="relative">
              <Textarea value={sql} readOnly className="font-mono text-sm h-20 bg-gray-50" />
              <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={copyToClipboard}>
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/admin/dashboard">ダッシュボードに戻る</Link>
          </Button>
          <Button onClick={markAsUpdated} disabled={updated}>
            <Database className="mr-2 h-4 w-4" />
            {updated ? "更新済み" : "更新完了をマーク"}
          </Button>
        </CardFooter>
      </Card>

      {updated && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>更新完了</AlertTitle>
          <AlertDescription>
            データベースの更新が完了しました。正解発表機能が使用できるようになりました。
            <div className="mt-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/dashboard">ダッシュボードに戻る</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
