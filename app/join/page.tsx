"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/supabase"

export default function JoinPage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (!code.trim()) {
      setError("コードを入力してください")
      return
    }

    setLoading(true)
    try {
      const { data, error: queryError } = await supabase.from("quizzes").select("*").eq("code", code.trim()).single()

      if (queryError || !data) {
        setError("クイズが見つかりませんでした。コードを確認してください。")
        return
      }
      if (!data.is_active) {
        setError("このクイズは現在アクティブではありません。")
        return
      }

      router.push(`/join/${code.trim()}`)
    } catch (err) {
      console.error("Error joining quiz:", err)
      setError("エラーが発生しました。もう一度お試しください。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="brand-page flex items-center justify-center">
      <div className="brand-shell w-full max-w-lg">
        <header className="brand-header text-center">
          <div className="brand-logo-frame mx-auto h-20 w-20 sm:h-24 sm:w-24"><img src="/icon.png" alt="Quiz App" /></div>
          <p className="brand-kicker mt-5">JOIN QUIZ</p>
          <h1 className="mt-2 text-3xl font-black">クイズに参加</h1>
          <p className="mt-2 text-sm text-white/60">先生から案内された4桁のコードを入力してください。</p>
        </header>

        <div className="brand-content">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-3xl border border-emerald-950/10 bg-white/70 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e4efe8] text-[#245845]"><Users className="h-5 w-5" /></div>
                <div><p className="brand-label">ACCESS CODE</p><p className="font-bold text-[#294b3e]">クイズコード</p></div>
              </div>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="0000"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                maxLength={4}
                className="h-16 text-center font-mono text-3xl font-black tracking-[0.35em]"
                autoFocus
              />
              {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}
            </div>

            <Button type="submit" className="h-13 w-full rounded-2xl bg-[#1f5a46] py-6 text-base font-black text-white hover:bg-[#184b3a]" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />確認中...</> : <>参加する<ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
