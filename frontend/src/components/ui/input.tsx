import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-border-default bg-bg-surface px-3.5 text-sm text-text-primary shadow-[inset_0_1px_2px_rgb(30_33_42/0.025)] placeholder:text-text-disabled transition-colors",
        "focus:outline-none focus:ring-4 focus:ring-brand-200/45 focus:border-accent-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
