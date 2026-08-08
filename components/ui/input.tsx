import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#bac8bb] bg-white/80 px-3.5 py-2 text-base text-[#193c31] shadow-[inset_0_1px_2px_rgba(28,60,46,0.04)] outline-none transition placeholder:text-[#8b9891] focus-visible:border-[#5f8d74] focus-visible:ring-2 focus-visible:ring-[#5f8d74]/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
