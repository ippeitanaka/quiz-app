import type React from "react"
import "@/app/globals.css"
import { Noto_Serif_JP, Zen_Maru_Gothic } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const notoSerifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-title",
})

const zenMaruGothic = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
})

export const metadata = {
  title: "Quiz App",
  description: "Create and join interactive quizzes",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${notoSerifJp.variable} ${zenMaruGothic.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
