import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-accent-primary text-text-on-brand shadow-[0_3px_10px_rgb(114_83_32/0.2)] hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-[0_6px_16px_rgb(114_83_32/0.24)]",
        secondary: "bg-bg-raised text-text-primary shadow-sm hover:-translate-y-0.5 hover:bg-brand-50",
        outline: "border border-border-strong bg-bg-surface text-text-primary shadow-sm hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50",
        ghost: "text-accent-link hover:bg-brand-50",
        destructive: "bg-bad-fg text-white shadow-sm hover:-translate-y-0.5 hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
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
