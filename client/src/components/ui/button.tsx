import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// The base class carries only shape, layout, focus and disabled behaviour.
// Hover treatment belongs to the variant that wants it: the previous base
// class hard-coded `hover:bg-[#D26A4E] hover:border-[#D26A4E] hover:text-white`
// plus a 4px lift, so ghost, outline, secondary, destructive and icon buttons
// all turned coral and jumped on hover.
//
// Disabled uses a neutral fill rather than `opacity-50`. Halving the opacity of
// a coral button computed to 1.93:1 against its white label — users read that as
// "booking is unavailable" and left, rather than "pick your dates first".
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-[var(--disabled)] disabled:text-[var(--disabled-foreground)] disabled:border-transparent disabled:shadow-none disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground transform hover:-translate-y-px hover:bg-[#b23a28] hover:shadow-lg",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[#b91c1c]",
        outline:
          "border border-input bg-background hover:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[#ebe7e3]",
        ghost: "hover:bg-secondary",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      // Heights meet the 44px touch-target floor by default. `sm` stays at 40px
      // for dense desktop-only surfaces and must not be used for primary CTAs.
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-10 px-4",
        lg: "h-12 px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
