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
    pink: "from-pastel-pink/50 to-white",
    blue: "from-pastel-blue/50 to-white",
    green: "from-pastel-green/50 to-white",
    yellow: "from-pastel-yellow/50 to-white",
    purple: "from-pastel-purple/50 to-white",
  }

  return (
    <Card
      className={cn(
        "w-full overflow-hidden border-2 bg-gradient-to-br animate-in fade-in-0 zoom-in-95 duration-300",
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
