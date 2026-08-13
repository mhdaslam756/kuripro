import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}

/**
 * MobileHeader renders an iOS/Android native app top navigation bar.
 * Respects top safe area insets (notches/dynamic islands) and provides
 * smooth back navigation & action button slots.
 */
export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions,
  className,
}: MobileHeaderProps) {
  const navigate = useNavigate();

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between border-b border-border-default/80 bg-bg-surface/90 px-4 pt-[max(0.65rem,env(safe-area-inset-top))] pb-3 backdrop-blur-2xl lg:hidden",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {showBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 text-text-primary active-bounce"
            aria-label="Go Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold text-text-primary leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[11px] font-medium text-text-secondary">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
