import type React from "react"
import type { Metadata } from "next"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "Quiz Management",
  description: "デジタルクイズとアナログスコアボードを管理するクイズアプリ",
  generator: "Next.js",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.png", sizes: "1289x1295", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "1289x1295", type: "image/png" }],
    shortcut: ["/icon.png"],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
