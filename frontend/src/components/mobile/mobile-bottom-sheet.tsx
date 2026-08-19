import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

export interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Extra classes on the sheet panel */
  className?: string;
  /** Show a close button in the header area */
  showCloseButton?: boolean;
  /** Max height override (default 85dvh) */
  maxHeight?: string;
}

/**
 * MobileBottomSheet — slide-up modal panel for mobile.
 * GPU-accelerated (transform + opacity only), respects iOS safe-area-inset-bottom.
 * Hidden entirely above the lg breakpoint; desktop uses normal dialogs/sheets.
 */
export function MobileBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  showCloseButton = true,
  maxHeight = "85dvh",
}: MobileBottomSheetProps) {
  // Lock body scroll while sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] lg:hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-sm"
        style={{ animation: "fade-in-up 0.2s ease forwards" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-[28px] border-t border-border-default bg-bg-surface shadow-2xl",
          className,
        )}
        style={{
          maxHeight,
          animation: "slide-up 0.28s cubic-bezier(0.32,0.72,0,1) forwards",
          willChange: "transform, opacity",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-border-strong/30" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex shrink-0 items-center justify-between border-b border-border-default/60 px-5 py-3">
            <div className="min-w-0">
              {title && (
                <p className="font-display text-base font-bold leading-tight text-text-primary">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="ml-3 flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-raised text-text-secondary transition-colors active:scale-90 hover:text-text-primary"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
