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
        <div className="flex items-center gap-3 rounded-full border border-emerald-900/10 bg-white/70 px-5 py-3 text-sm font-bold text-emerald-950 shadow-sm backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin" />
          ダッシュボードを準備しています
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[#fffdf5]/90 shadow-[0_30px_90px_rgba(30,68,48,0.18)] backdrop-blur md:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#173f32_0%,#245845_54%,#2f6e56_100%)] p-12 text-[#fff9e9] md:flex md:flex-col md:justify-between">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-[#f3cf78]/20 bg-[#f3cf78]/10" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold tracking-[0.2em]">
              <ShieldCheck className="h-4 w-4 text-[#f3cf78]" />
              ADMIN CONSOLE
            </div>
            <div className="mt-10 flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.7rem] border border-white/20 bg-white/10 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                <img src="/icon.png" alt="Quiz App" className="h-full w-full object-contain drop-shadow-xl" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-[0.18em] text-[#f3cf78]">QUIZ MANAGEMENT</p>
                <h1 className="mt-2 text-4xl font-bold leading-tight">授業を、もっと<br />見やすく・使いやすく。</h1>
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-md space-y-4">
            <p className="text-lg leading-8 text-white/80">
              クイズの作成・実施・参加者管理を、ひとつのダッシュボードにまとめています。
            </p>
            <div className="h-px w-full bg-gradient-to-r from-[#f3cf78]/70 to-transparent" />
            <p className="text-sm text-white/55">TMC Quiz Management System</p>
          </div>
        </section>

        <section className="flex items-center justify-center p-7 sm:p-10 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 md:hidden">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-950/5 p-2 shadow-sm">
                <img src="/icon.png" alt="Quiz App" className="h-full w-full object-contain" />
              </div>
              <p className="text-xs font-bold tracking-[0.2em] text-emerald-800">ADMIN CONSOLE</p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-[#193c31]">管理者ログイン</h2>
              <p className="mt-3 text-sm leading-6 text-[#60736b]">ログイン後は管理ダッシュボードへ直接移動します。</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-[#284a3d]">メールアドレス</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl border-emerald-950/15 bg-white/80 px-4 shadow-none focus-visible:ring-emerald-700"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-bold text-[#284a3d]">パスワード</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-emerald-950/15 bg-white/80 px-4 shadow-none focus-visible:ring-emerald-700"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#1f5a46] text-base font-bold text-white shadow-[0_10px_24px_rgba(31,90,70,0.24)] hover:bg-[#184b3a]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />ログイン中...</span>
                ) : (
                  <span className="flex items-center gap-2">ログイン <ArrowRight className="h-4 w-4" /></span>
                )}
              </Button>
            </form>

            <div className="mt-7 flex items-center gap-3 rounded-xl bg-[#eef4e8] px-4 py-3 text-xs leading-5 text-[#52675d]">
              <LockKeyhole className="h-4 w-4 shrink-0 text-[#2d664f]" />
              管理者アカウントでのみアクセスできます。
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
