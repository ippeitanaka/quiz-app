import { Button } from "@/components/ui/button"
import Link from "next/link"
import { QuizCard } from "@/components/ui/quiz-card"
import { Settings, Bell } from "lucide-react"
import { SupabaseConfigCheck } from "@/components/supabase-config-check"

export default function Home() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary animate-bounce-soft">クイズアプリ</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto">
          楽しいクイズを作成したり、参加したりしましょう！
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <SupabaseConfigCheck>
          <QuizCard
            title="クイズを作成する"
            description="オリジナルのクイズを作成して、友達や生徒に共有しましょう"
            gradient="pink"
            footer={
              <Button asChild className="w-full font-semibold">
                <Link href="/admin/login">管理者ログイン</Link>
              </Button>
            }
          >
            <div className="flex flex-col items-center space-y-4 py-6">
              <div className="h-40 w-40 bg-primary/20 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="80"
                  height="80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                </svg>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>多種類の問題形式</li>
                <li>簡単なアクセスコード</li>
                <li>リアルタイムの回答とスコア</li>
                <li>QRコードを使って簡単に共有</li>
                <li>🆕 早押しボタン専用モード</li>
              </ul>
            </div>
          </QuizCard>
        </SupabaseConfigCheck>

        <QuizCard
          title="クイズに参加する"
          description="URLまたはQRコードでクイズに参加しよう！"
          gradient="blue"
          footer={
            <Button asChild className="w-full font-semibold">
              <Link href="/join">参加する</Link>
            </Button>
          }
        >
          <div className="flex flex-col items-center space-y-4 py-6">
            <div className="h-40 w-40 bg-accent/20 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>参加時に名前を設定するだけ</li>
              <li>ユニークな名前を選ぼう</li>
              <li>リアルタイムでクイズに回答</li>
              <li>他の参加者とスコアを競おう</li>
              <li>🆕 早押しモードも選択可能</li>
            </ul>
          </div>
        </QuizCard>
      </div>

      {/* 早押し機能の紹介 */}
      <div className="w-full max-w-4xl">
        <QuizCard
          title="🆕 早押しボタン機能"
          description="クイズとは別に、早押しボタンとして使えます"
          gradient="yellow"
        >
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-6 py-4">
            <div className="flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-xl">
                <Bell className="h-16 w-16 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>問題なしで早押しボタンだけ使える</li>
                <li>押した順番が自動で記録される</li>
                <li>管理者がポイントを付与</li>
                <li>リアルタイムでランキング表示</li>
                <li>クイズ大会や授業での活用に最適</li>
              </ul>
              <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                💡 使い方: クイズを作成後、ダッシュボードから「早押し」ボタンをクリック。参加者は「早押しモード」を選んで参加！
              </p>
            </div>
          </div>
        </QuizCard>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" asChild>
          <Link href="/config">
            <Settings className="h-4 w-4 mr-2" />
            Supabase設定
          </Link>
        </Button>
      </div>
    </div>
  )
}
