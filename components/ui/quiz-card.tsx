import type React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface QuizCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  footer?: React.ReactNode
  gradient?: "pink" | "blue" | "green" | "yellow" | "purple"
}

export function QuizCard({
  title,
  description,
  footer,
  gradient = "pink",
  className,
  children,
  ...props
}: QuizCardProps) {
  const gradientClasses = {
    pink: "from-[#f0c7a0]/85 via-[#f7ead1]/95 to-[#fffdfa]",
    blue: "from-[#b8d9df]/85 via-[#e8f3ee]/95 to-[#fffdfa]",
    green: "from-[#bfd7a8]/85 via-[#edf4df]/95 to-[#fffdfa]",
    yellow: "from-[#efd9a8]/85 via-[#f8efd9]/95 to-[#fffdfa]",
    purple: "from-[#c9c6de]/85 via-[#eeedf7]/95 to-[#fffdfa]",
  }

  return (
    <Card
      className={cn(
        "w-full overflow-hidden border border-[#9eb197]/60 bg-gradient-to-br animate-in fade-in-0 zoom-in-95 duration-300 shadow-[0_14px_28px_rgba(52,82,64,0.12)]",
        gradientClasses[gradient],
        className,
      )}
      {...props}
    >
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}
