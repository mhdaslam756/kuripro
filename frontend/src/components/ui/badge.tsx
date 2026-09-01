import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral: "bg-bg-raised text-text-secondary border-border-default",
        success: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30",
        warning: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
        danger: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
        info: "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30",
        brand: "bg-[#6D28D9]/20 text-[#A855F7] border-[#8B5CF6]/30",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
