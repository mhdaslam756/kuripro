import { Wifi } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AtmCardProps {
  /** Small caption above the amount, e.g. "Today's collection". */
  label: string;
  /** Already-formatted headline figure. */
  amount: ReactNode;
  /** Line under the amount. */
  caption?: ReactNode;
  /** Top-right control, e.g. a show/hide toggle. */
  action?: ReactNode;
  /** Bottom row, laid out like the number and expiry on a real card. */
  footer?: ReactNode;
  className?: string;
}

/**
 * A bank-card styled summary: gradient face, EMV chip, contactless mark, big figure and a detail row
 * along the bottom. Sized to the 1.586 card ratio so it reads as a card on a phone screen.
 */
export function AtmCard({ label, amount, caption, action, footer, className }: AtmCardProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-[212px] flex-col justify-between overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#b45cf8_0%,#7c5cf6_46%,#4f6df5_100%)] p-5 text-white shadow-[0_22px_44px_-16px_rgba(30,12,100,0.7)]",
        className,
      )}
    >
      {/* Card-face sheen */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-white/15 blur-sm" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-white/10" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* EMV chip */}
          <span
            aria-hidden="true"
            className="grid h-7 w-9 grid-cols-2 grid-rows-3 gap-px overflow-hidden rounded-md bg-gradient-to-br from-amber-200 to-amber-400 p-[3px] shadow-inner"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="rounded-[2px] border border-amber-600/30" />
            ))}
          </span>
          <Wifi aria-hidden="true" size={18} className="rotate-90 text-white/80" />
        </div>
        {action}
      </div>

      <div className="relative mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">{label}</p>
        <p className="mt-1 font-display text-[40px] font-bold leading-none tracking-tight tabular-nums">{amount}</p>
        {caption ? <p className="mt-1.5 text-xs text-white/80">{caption}</p> : null}
      </div>

      {footer ? <div className="relative mt-4 flex items-end justify-between gap-3">{footer}</div> : null}
    </div>
  );
}

/** One labelled figure for an AtmCard footer, like "VALID THRU" on a card. */
export function AtmCardStat({ label, value, align = "left" }: { label: string; value: ReactNode; align?: "left" | "right" }) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">{label}</p>
      <p className="truncate font-display text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
