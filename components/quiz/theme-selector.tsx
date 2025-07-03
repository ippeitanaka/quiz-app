"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

const THEME_COLORS = [
  { name: "パステルブルー", value: "pastel-blue", bg: "bg-blue-100", text: "text-blue-800" },
  { name: "パステルピンク", value: "pastel-pink", bg: "bg-pink-100", text: "text-pink-800" },
  { name: "パステルグリーン", value: "pastel-green", bg: "bg-green-100", text: "text-green-800" },
  { name: "パステルイエロー", value: "pastel-yellow", bg: "bg-yellow-100", text: "text-yellow-800" },
  { name: "パステルパープル", value: "pastel-purple", bg: "bg-purple-100", text: "text-purple-800" },
]

interface ThemeSelectorProps {
  initialTheme?: string
  initialLogo?: string
  initialBackground?: string
  onSave: (theme: { color: string; logo?: string; background?: string }) => void
}

export function ThemeSelector({
  initialTheme = "pastel-blue",
  initialLogo = "",
  initialBackground = "",
  onSave,
}: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(initialTheme)
  const [logoUrl, setLogoUrl] = useState(initialLogo)
  const [backgroundUrl, setBackgroundUrl] = useState(initialBackground)

  const handleSave = () => {
    onSave({
      color: selectedTheme,
      logo: logoUrl,
      background: backgroundUrl,
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>クイズテーマをカスタマイズ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>テーマカラー</Label>
          <RadioGroup
            value={selectedTheme}
            onValueChange={setSelectedTheme}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5"
          >
            {THEME_COLORS.map((theme) => (
              <div key={theme.value} className="flex items-center space-x-2">
                <RadioGroupItem value={theme.value} id={theme.value} />
                <Label
                  htmlFor={theme.value}
                  className={cn("flex items-center space-x-2 px-3 py-2 rounded", theme.bg, theme.text)}
                >
                  <span className="w-3 h-3 rounded-full bg-current" />
                  <span>{theme.name}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">ロゴ画像URL（オプション）</Label>
          <Input
            id="logo"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full"
          />
          {logoUrl && (
            <div className="mt-2 flex justify-center">
              <img src={logoUrl || "/placeholder.svg"} alt="Logo preview" className="max-h-20 object-contain" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="background">背景画像URL（オプション）</Label>
          <Input
            id="background"
            value={backgroundUrl}
            onChange={(e) => setBackgroundUrl(e.target.value)}
            placeholder="https://example.com/background.jpg"
            className="w-full"
          />
          {backgroundUrl && (
            <div className="mt-2 flex justify-center">
              <img
                src={backgroundUrl || "/placeholder.svg"}
                alt="Background preview"
                className="max-h-32 w-full object-cover rounded-md"
              />
            </div>
          )}
        </div>

        <Button onClick={handleSave} className="w-full">
          テーマを保存
        </Button>
      </CardContent>
    </Card>
  )
}
