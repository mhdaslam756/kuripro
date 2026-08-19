import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ── NativeSection ──────────────────────────────────────────────────────────────
// Grouped section container (no card-per-item; uses dividers between rows).

export interface NativeSectionProps {
  children: ReactNode;
  label?: string;
  className?: string;
  /** Use flush for edge-to-edge full-width sections (no border-radius) */
  flush?: boolean;
}

export function NativeSection({ children, label, className, flush = false }: NativeSectionProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label && <p className="native-section-label">{label}</p>}
      <div className={flush ? "native-section-flush" : "native-section"}>
        {children}
      </div>
    </div>
  );
}

// ── MobileList (now wraps in NativeSection) ────────────────────────────────────

export interface MobileListProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function MobileList({ children, label, className }: MobileListProps) {
  return (
    <NativeSection label={label} className={className}>
      {children}
    </NativeSection>
  );
}

// ── MobileListItem (native row — no individual card) ──────────────────────────

export interface MobileListItemProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
  showChevron?: boolean;
}

export function MobileListItem({
  title,
  subtitle,
  icon,
  badge,
  action,
  onClick,
  className,
  showChevron = true,
}: MobileListItemProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={cn(
        "native-row",
        isClickable && "native-row-pressable cursor-pointer",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon ? (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-accent-primary font-semibold">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-text-primary">
              {title}
            </span>
            {badge ? <div className="shrink-0">{badge}</div> : null}
          </div>
          {subtitle ? (
            <div className="mt-0.5 truncate text-xs text-text-secondary">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      {action ? (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      ) : isClickable && showChevron ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
      ) : null}
    </div>
  );
}

// ── TransactionRow — banking-style row ────────────────────────────────────────

export interface TransactionRowProps {
  icon?: ReactNode;
  /** Tailwind bg class for icon bubble, e.g. "bg-good-bg" */
  iconBg?: string;
  /** Tailwind text class for icon, e.g. "text-good-fg" */
  iconColor?: string;
  title: string;
  subtitle?: string;
  /** Pre-formatted amount string e.g. "₹1,200" */
  amount: string;
  /** true = green credit, false = red debit, undefined = neutral */
  amountPositive?: boolean;
  showArrow?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Banking-style transaction row — right-aligned color-coded amount,
 * directional arrow, tabular-nums. Renders inside a native-section.
 */
export function TransactionRow({
  icon,
  iconBg = "bg-bg-raised",
  iconColor = "text-text-secondary",
  title,
  subtitle,
  amount,
  amountPositive,
  showArrow = true,
  onClick,
  className,
}: TransactionRowProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "mobile-tx-row select-none",
        onClick && "native-row-pressable cursor-pointer",
        className,
      )}
    >
      {/* Icon bubble */}
      <div className={cn("mobile-tx-icon shrink-0", iconBg, iconColor)}>
        {icon}
      </div>

      {/* Center */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary leading-tight">
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 truncate text-[11px] text-text-secondary">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: amount + arrow */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <div className="flex items-center gap-1">
          {showArrow && amountPositive !== undefined && (
            amountPositive
              ? <ArrowDownLeft size={12} className="text-good-fg" />
              : <ArrowUpRight size={12} className="text-bad-fg" />
          )}
          <span
            className={cn(
              "text-sm font-bold tabular-nums leading-tight",
              amountPositive === true && "mobile-tx-amount-credit",
              amountPositive === false && "mobile-tx-amount-debit",
              amountPositive === undefined && "text-text-primary",
            )}
          >
            {amount}
          </span>
        </div>
      </div>
    </div>
  );
}
