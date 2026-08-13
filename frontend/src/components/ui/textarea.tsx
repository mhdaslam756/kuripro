import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-sm border border-border-default bg-bg-surface px-3.5 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-disabled transition-all",
        "focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
