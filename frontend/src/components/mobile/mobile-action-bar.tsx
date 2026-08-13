import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MobileActionBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * MobileActionBar renders a fixed bottom action bar for primary actions on mobile views.
 * Respects bottom safe area insets (home indicator).
 */
export function MobileActionBar({ children, className }: MobileActionBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border-default/80 bg-bg-surface/95 p-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0_0_0/0.08)] backdrop-blur-2xl lg:hidden",
        className
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        {children}
      </div>
    </div>
  );
}
