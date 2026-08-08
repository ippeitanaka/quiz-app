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
  // Keep the legacy variant names for compatibility, but express every card
  // with the logo palette so the app reads as one visual system.
  const gradientClasses = {
    pink: "from-[#f7edcf] via-[#fffdf5] to-[#edf3e8]",
    blue: "from-[#e4efe8] via-[#fffdf5] to-[#f7edcf]",
    green: "from-[#dcebe1] via-[#fffdf5] to-[#f5e7bd]",
    yellow: "from-[#f5e3af] via-[#fffdf5] to-[#e7f0e9]",
    purple: "from-[#e8efe5] via-[#fffdf5] to-[#f2dfaa]",
  }

  const railClasses = {
    pink: "from-[#1f5a46] via-[#5d9677] to-[#f0cf77]",
    blue: "from-[#173f32] via-[#5d9677] to-[#f0cf77]",
    green: "from-[#1f5a46] via-[#73a58a] to-[#f0cf77]",
    yellow: "from-[#c99b37] via-[#f0cf77] to-[#5d9677]",
    purple: "from-[#173f32] via-[#1f5a46] to-[#f0cf77]",
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
