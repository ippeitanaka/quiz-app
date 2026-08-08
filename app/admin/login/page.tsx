"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, LockKeyhole, ShieldCheck } from "lucide-react"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/admin/dashboard")
    }
  }, [isLoading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        const normalized = (error.message || "").toLowerCase()

        if (normalized.includes("invalid login credentials")) {
          setError("メールアドレスまたはパスワードが正しくありません。")
        } else if (normalized.includes("email not confirmed")) {
          setError("メール確認が未完了です。SupabaseのAuth Usersで確認状態をチェックしてください。")
        } else {
          setError(`ログインに失敗しました: ${error.message}`)
        }
      } else {
        router.replace("/admin/dashboard")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("ログイン中にエラーが発生しました。")
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="brand-loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          ダッシュボードを準備しています
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/45 bg-[#fffaf3]/95 shadow-[0_30px_90px_rgba(194,87,15,0.22)] backdrop-blur md:grid-cols-[1.08fr_0.92fr]">
        <section className="brand-header relative hidden overflow-hidden p-12 md:flex md:flex-col md:justify-between">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-[#ffe08b]/25 bg-[#ffe08b]/10" />
          <div className="absolute left-10 top-1/2 h-24 w-24 rounded-full bg-[#42b3fb]/15 blur-2xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold tracking-[0.2em]">
              <ShieldCheck className="h-4 w-4 text-[#ffe17f]" />
              ADMIN CONSOLE
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div className="brand-logo-frame brand-logo-frame--hero">
                <img src="/icon.png" alt="Quiz App" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-[0.18em] text-[#fff2a8]">QUIZ MANAGEMENT</p>
                <h1 className="mt-2 text-4xl font-bold leading-tight">授業を、もっと<br />見やすく・使いやすく。</h1>
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-md space-y-4">
            <p className="text-lg leading-8 text-white/80">
              クイズの作成・実施・参加者管理を、ひとつのダッシュボードにまとめています。
            </p>
            <div className="h-px w-full bg-gradient-to-r from-[#f0cf77]/70 to-transparent" />
            <p className="text-sm text-white/55">TMC Quiz Management System</p>
          </div>
        </section>

        <section className="flex items-center justify-center p-7 sm:p-10 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 md:hidden">
              <div className="brand-logo-frame brand-logo-frame--hero justify-start">
                <img src="/icon.png" alt="Quiz App" />
              </div>
              <p className="mt-4 text-xs font-bold tracking-[0.2em] text-[#e16616]">ADMIN CONSOLE</p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">管理者ログイン</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">ログイン後は管理ダッシュボードへ直接移動します。</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-foreground">メールアドレス</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 px-4"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-bold text-foreground">パスワード</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 px-4"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />ログイン中...</span>
                ) : (
                  <span className="flex items-center gap-2">ログイン <ArrowRight className="h-4 w-4" /></span>
                )}
              </Button>
            </form>

            <div className="mt-7 flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-xs leading-5 text-muted-foreground">
              <LockKeyhole className="h-4 w-4 shrink-0 text-primary" />
              管理者アカウントでのみアクセスできます。
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
