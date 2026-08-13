import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MobileListProps {
  children: ReactNode;
  className?: string;
}

export function MobileList({ children, className }: MobileListProps) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {children}
    </div>
  );
}

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
        "group relative flex min-h-[4rem] items-center justify-between gap-3 rounded-2xl border border-border-default/80 bg-bg-surface p-3.5 shadow-xs transition-all",
        isClickable && "active:scale-[0.98] active:bg-bg-raised cursor-pointer",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-accent-primary font-semibold">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-sans text-sm font-semibold text-text-primary">
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
        <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-hover:translate-x-0.5" />
      ) : null}
    </div>
  );
}
