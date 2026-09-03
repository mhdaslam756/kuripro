import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showPasswordToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";

    if (isPassword && showPasswordToggle) {
      return (
        <div className="relative w-full">
          <input
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={cn(
              "h-11 min-h-[44px] w-full rounded-sm border border-border-default bg-bg-surface px-4 text-base sm:text-sm text-text-primary placeholder:text-text-disabled transition-all",
              "focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className,
              "pr-11",
            )}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.preventDefault();
              setShowPassword((prev) => !prev);
            }}
            disabled={props.disabled}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex size-7 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-raised/70 active:scale-95 transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} className="shrink-0" /> : <Eye size={18} className="shrink-0" />}
          </button>
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-11 min-h-[44px] w-full rounded-sm border border-border-default bg-bg-surface px-4 text-base sm:text-sm text-text-primary placeholder:text-text-disabled transition-all",
          "focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
