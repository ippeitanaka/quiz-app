"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { QuizCard } from "@/components/ui/quiz-card"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        setError("ログインに失敗しました。メールアドレスとパスワードを確認してください。")
      } else {
        router.push("/admin/dashboard")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("ログイン中にエラーが発生しました。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <Link href="/" className="absolute top-4 left-4 text-muted-foreground hover:text-primary transition">
        ← ホームに戻る
      </Link>

      <div className="w-full max-w-md">
        <QuizCard title="管理者ログイン" description="管理者アカウントでログインしてください" gradient="purple">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                placeholder="example@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                パスワード
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </QuizCard>
      </div>
    </div>
  )
}
