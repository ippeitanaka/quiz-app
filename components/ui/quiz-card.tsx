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
    pink: "from-[#f2e2d7] via-[#fffaf0] to-[#f7f4e7]",
    blue: "from-[#e2edf3] via-[#f7fbf8] to-[#f7f3e6]",
    green: "from-[#e3eee2] via-[#f7faf2] to-[#f8f1df]",
    yellow: "from-[#f5e8c8] via-[#fff9e9] to-[#edf3e5]",
    purple: "from-[#e9e4f0] via-[#fbf8f3] to-[#e8f0e8]",
  }

  const railClasses = {
    pink: "from-[#a86455] via-[#d49b74] to-[#f0cf77]",
    blue: "from-[#315f7d] via-[#6f9cb8] to-[#85ad95]",
    green: "from-[#1f5a46] via-[#5d9677] to-[#f0cf77]",
    yellow: "from-[#8a6b24] via-[#d1a850] to-[#5d9677]",
    purple: "from-[#6a558c] via-[#9d89bc] to-[#5d9677]",
  }

  return (
    <Card
      className={cn(
        "w-full overflow-hidden border border-emerald-950/10 bg-gradient-to-br shadow-[0_16px_38px_rgba(45,79,59,0.10)] backdrop-blur transition duration-200 hover:shadow-[0_20px_44px_rgba(45,79,59,0.13)]",
        gradientClasses[gradient],
        className,
      )}
      {...props}
    >
      <div className={cn("h-1.5 bg-gradient-to-r", railClasses[gradient])} />
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}
