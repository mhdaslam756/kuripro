import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral: "bg-bg-raised text-text-secondary border-border-default",
        success: "bg-good-bg text-good-fg border-good-border",
        warning: "bg-warn-bg text-warn-fg border-warn-border",
        danger: "bg-bad-bg text-bad-fg border-bad-border",
        info: "bg-info-bg text-info-fg border-info-border",
        brand: "bg-brand-100 text-brand-700 border-brand-300",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
