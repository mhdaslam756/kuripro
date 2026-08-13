import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 min-h-[44px] w-full rounded-sm border border-border-default bg-bg-surface px-4 text-base sm:text-sm text-text-primary placeholder:text-text-disabled transition-all",
        "focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
