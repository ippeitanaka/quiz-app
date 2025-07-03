"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  PieChart,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Bar,
  Pie,
  Line,
  Tooltip,
  Legend,
  Cell,
} from "recharts"

interface QuizAnalytics {
  quizId: string
  title: string
  sessions: {
    id: string
    date: string
    participants: number
    teams?: {
      id: string
      name: string
      score: number
    }[]
    questions: {
      id: string
      text: string
      correctRate: number
      averageTime: number
      optionDistribution: {
        optionId: string
        optionText: string
        count: number
      }[]
    }[]
  }[]
}

interface AnalyticsDashboardProps {
  analytics: QuizAnalytics
}

export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  const [selectedSession, setSelectedSession] = useState(analytics.sessions.length > 0 ? analytics.sessions[0].id : "")

  const session = analytics.sessions.find((s) => s.id === selectedSession)

  // カラーパレット
  const COLORS = ["#F8BBD0", "#B3E5FC", "#C8E6C9", "#FFE0B2", "#E1BEE7", "#FFCCBC"]

  if (!session) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">分析用データが存在しません</div>
        </CardContent>
      </Card>
    )
  }

  // 正答率データの作成
  const correctRateData = session.questions.map((q, index) => ({
    name: `Q${index + 1}`,
    正答率: q.correctRate * 100,
    questionText: q.text,
  }))

  // 平均回答時間データの作成
  const averageTimeData = session.questions.map((q, index) => ({
    name: `Q${index + 1}`,
    平均時間: q.averageTime,
    questionText: q.text,
  }))

  // チームスコアデータの作成
  const teamScoreData =
    session.teams?.map((team) => ({
      name: team.name,
      value: team.score,
    })) || []

  // 質問別の回答分布データ
  const getDistributionData = (questionIndex: number) => {
    if (!session.questions[questionIndex]) return []

    return session.questions[questionIndex].optionDistribution.map((option) => ({
      name: option.optionText,
      value: option.count,
    }))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{analytics.title} - 分析</CardTitle>
        <div className="mt-2">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="セッションを選択" />
            </SelectTrigger>
            <SelectContent>
              {analytics.sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {new Date(session.date).toLocaleDateString()}({session.participants}名参加)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="questions">質問別分析</TabsTrigger>
            {session.teams && session.teams.length > 0 && <TabsTrigger value="teams">チーム分析</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">正答率</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={correctRateData}>
                      <XAxis dataKey="name" />
                      <YAxis unit="%" domain={[0, 100]} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}%`, "正答率"]}
                        labelFormatter={(label) => {
                          const item = correctRateData.find((d) => d.name === label)
                          return item ? item.questionText : label
                        }}
                      />
                      <Bar dataKey="正答率" fill="#F8BBD0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">平均回答時間</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={averageTimeData}>
                      <XAxis dataKey="name" />
                      <YAxis unit="秒" />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}秒`, "平均時間"]}
                        labelFormatter={(label) => {
                          const item = averageTimeData.find((d) => d.name === label)
                          return item ? item.questionText : label
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="平均時間"
                        stroke="#B3E5FC"
                        strokeWidth={2}
                        dot={{ fill: "#B3E5FC", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {session.teams && session.teams.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">チームスコア</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={teamScoreData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#C8E6C9" radius={[0, 4, 4, 0]}>
                          {teamScoreData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {session.questions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Q{index + 1}: {question.text}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={getDistributionData(index)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          fill="#8884d8"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {getDistributionData(index).map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-xs text-center">
                      正答率: {(question.correctRate * 100).toFixed(1)}% | 平均時間: {question.averageTime.toFixed(1)}秒
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {session.teams && session.teams.length > 0 && (
            <TabsContent value="teams">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">チーム別スコア分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={teamScoreData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        label={({ name, value, percent }) => `${name}: ${value}点 (${(percent * 100).toFixed(0)}%)`}
                      >
                        {teamScoreData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}
