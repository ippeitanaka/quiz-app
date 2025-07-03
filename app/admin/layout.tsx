import type React from "react"
import { AuthProvider } from "@/lib/auth/auth-context"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthProvider>{children}</AuthProvider>
}
