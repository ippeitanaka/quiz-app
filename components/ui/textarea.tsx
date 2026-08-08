import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[96px] w-full rounded-xl border border-[#bac8bb] bg-white/78 px-3.5 py-3 text-base text-[#193c31] shadow-[inset_0_1px_2px_rgba(28,60,46,0.04)] outline-none transition placeholder:text-[#8b9891] focus-visible:border-[#5f8d74] focus-visible:ring-2 focus-visible:ring-[#5f8d74]/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea }
