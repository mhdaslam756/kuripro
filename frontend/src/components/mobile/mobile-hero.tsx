import { Bell } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { IconTile, type IconTone } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";

interface MobileHeroProps {
  /** Small line above the name, e.g. "Welcome back". */
  greeting?: string;
  name: string;
  /** Hero content under the greeting: a balance card, quick actions. */
  children?: ReactNode;
  className?: string;
}

/**
 * Phone home-screen top: the greeting and a bell on the plain page background, then a bank-card
 * summary and quick actions (passed as children). Pair it with MobileSheet for the content below.
 */
export function MobileHero({ greeting = "Welcome back", name, children, className }: MobileHeroProps) {
  return (
    <section className={cn("px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-text-primary", className)}>
      <div className="flex items-center justify-between gap-3 pb-4 pt-1">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary">{greeting}</p>
          <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight">{name}</h1>
        </div>
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-secondary shadow-xs active-bounce"
        >
          <Bell size={19} />
        </Link>
      </div>

      {children}
    </section>
  );
}

/** The page body of a phone home screen, under the hero. */
export function MobileSheet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-4 pb-4 pt-2", className)}>{children}</div>;
}

/** A coloured icon tile with a label under it: the quick-action pattern under the card. */
export function HeroAction({ to, label, icon, tone = "violet" }: { to: string; label: string; icon: ReactNode; tone?: IconTone }) {
  return (
    <Link to={to} className="flex flex-1 flex-col items-center gap-1.5 text-center active-bounce">
      <IconTile size="lg" solid tone={tone} className="shadow-sm">
        {icon}
      </IconTile>
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
    </Link>
  );
}
