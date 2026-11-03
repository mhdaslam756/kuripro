import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Soft coloured icon tiles: a pastel rounded square with a matching glyph. Each tone has a `soft`
 * form (a tint that works on light and dark surfaces) and a `solid` form (opaque pastel, for use on
 * the violet phone hero where a tint would turn muddy).
 */
const TONES = {
  sky: { soft: "bg-sky-500/15 text-sky-600", solid: "bg-sky-100 text-sky-600" },
  emerald: { soft: "bg-emerald-500/15 text-emerald-600", solid: "bg-emerald-100 text-emerald-600" },
  amber: { soft: "bg-amber-500/20 text-amber-600", solid: "bg-amber-100 text-amber-600" },
  rose: { soft: "bg-rose-500/15 text-rose-600", solid: "bg-rose-100 text-rose-600" },
  violet: { soft: "bg-violet-500/15 text-violet-600", solid: "bg-violet-100 text-violet-600" },
  orange: { soft: "bg-orange-500/15 text-orange-600", solid: "bg-orange-100 text-orange-600" },
  indigo: { soft: "bg-indigo-500/15 text-indigo-600", solid: "bg-indigo-100 text-indigo-600" },
  teal: { soft: "bg-teal-500/15 text-teal-600", solid: "bg-teal-100 text-teal-600" },
} as const;

export type IconTone = keyof typeof TONES;

const SIZES = {
  sm: "size-8 rounded-xl",
  md: "size-9 rounded-xl",
  lg: "size-12 rounded-2xl",
  xl: "size-16 rounded-[22px]",
} as const;

interface IconTileProps {
  children: ReactNode;
  tone?: IconTone;
  size?: keyof typeof SIZES;
  solid?: boolean;
  className?: string;
}

export function IconTile({ children, tone = "violet", size = "md", solid = false, className }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center font-bold",
        SIZES[size],
        solid ? TONES[tone].solid : TONES[tone].soft,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A stable tone for a free-form key (an activity action, a route), so the same thing is always the same colour. */
export function toneFor(key: string): IconTone {
  const k = key.toUpperCase();
  if (/(COLLECT|PAYMENT|PAID|RECEIPT|INCOME)/.test(k)) return "emerald";
  if (/(AUCTION|BID|WINNER)/.test(k)) return "amber";
  if (/(PAYOUT|REFUND|EXPENSE|DISBURS)/.test(k)) return "rose";
  if (/(MEMBER|USER|KYC|GUARANTOR|NOMINEE)/.test(k)) return "sky";
  if (/(CHIT|GROUP|CYCLE|SCHEME)/.test(k)) return "violet";
  if (/(NOTIFICATION|REMINDER|MESSAGE)/.test(k)) return "orange";
  return "indigo";
}
