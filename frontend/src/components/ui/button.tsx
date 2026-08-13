import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 focus-visible:ring-offset-2 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: "bg-accent-primary text-text-on-brand shadow-sm hover:opacity-95 active:opacity-90",
        secondary: "bg-bg-raised text-text-primary shadow-xs hover:bg-border-default/60 active:bg-border-default",
        outline: "border border-border-default bg-bg-surface text-text-primary shadow-xs hover:border-accent-primary/60 hover:bg-bg-raised active:bg-border-default/40",
        ghost: "text-accent-primary hover:bg-bg-raised active:bg-border-default/40",
        destructive: "bg-bad-fg text-white shadow-xs hover:opacity-95 active:opacity-90",
      },
      size: {
        sm: "h-9 min-h-[36px] px-3.5 text-xs rounded-xl",
        md: "h-11 min-h-[44px] px-4.5 text-sm rounded-2xl",
        lg: "h-12 min-h-[48px] px-6 text-base rounded-2xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";
