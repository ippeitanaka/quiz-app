"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Bell, MessageSquare, Puzzle } from "lucide-react"

type Props = {
  code: string
  participantId: string
}

export function ParticipantModeNav({ code, participantId }: Props) {
  const pathname = usePathname()

  const links = [
    {
      key: "quiz",
      label: "クイズ",
      href: `/play/${code}?participant=${participantId}`,
      icon: Puzzle,
      active: pathname.startsWith(`/play/${code}`),
    },
    {
      key: "buzzer",
      label: "早押し",
      href: `/buzzer/${code}?participant=${participantId}`,
      icon: Bell,
      active: pathname.startsWith(`/buzzer/${code}`),
    },
    {
      key: "question",
      label: "質問コーナー",
      href: `/question-corner/${code}?participant=${participantId}`,
      icon: MessageSquare,
      active: pathname.startsWith(`/question-corner/${code}`),
    },
  ]

  return (
    <div className="mb-4 rounded-lg border bg-white/90 p-2 backdrop-blur">
      <div className="grid grid-cols-3 gap-2">
        {links.map((item) => {
          const Icon = item.icon

          return (
            <Button
              key={item.key}
              asChild
              variant={item.active ? "default" : "outline"}
              className="h-11 w-full px-1 text-[11px] sm:px-3 sm:text-sm"
            >
              <Link href={item.href}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">
                  {item.key === "question" ? "質問" : item.label}
                </span>
              </Link>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
