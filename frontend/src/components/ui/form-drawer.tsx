import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSheetDrag } from "@/lib/use-sheet-drag";
import { cn } from "@/lib/utils";

const SIZES = {
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
} as const;

export interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Width of the right-hand drawer on desktop. Phones always get a full-width bottom sheet. */
  size?: keyof typeof SIZES;
  /** Sticky action bar; use FormDrawerActions for the usual Cancel + Submit pair. */
  footer?: ReactNode;
  children: ReactNode;
  /** Extra classes on the scrolling body. */
  bodyClassName?: string;
}

/**
 * A long form as a drawer: a bottom sheet on phones (swipe down to close, actions pinned above the
 * keyboard and the home indicator) and a right-hand slide-over on larger screens. The header and the
 * action bar stay put; only the body scrolls. Put the submit button in `footer` with `form="<id>"`.
 */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  size = "lg",
  footer,
  children,
  bodyClassName,
}: FormDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useSheetDrag(contentRef, () => onOpenChange(false));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={contentRef}
          // Don't pop the keyboard over the form the moment a sheet opens on a touch screen.
          onOpenAutoFocus={(e) => {
            if (window.matchMedia("(pointer: coarse)").matches) e.preventDefault();
          }}
          className={cn(
            "fixed z-50 flex flex-col bg-bg-surface shadow-2xl focus:outline-none transition ease-in-out",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
            // Phone: bottom sheet that leaves a strip of the page visible above it.
            "inset-x-0 bottom-0 max-h-[92dvh] w-full rounded-t-[28px] border-t border-border-default",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            // Desktop: slide-over from the right.
            "sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-full sm:w-full sm:rounded-none sm:rounded-l-[28px] sm:border-l sm:border-t-0",
            "sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right",
            SIZES[size],
          )}
        >
          <div
            className="flex shrink-0 touch-none justify-center pb-1 pt-3 sm:hidden"
            onPointerDown={drag.onPointerDown}
            onPointerMove={drag.onPointerMove}
            onPointerUp={drag.onPointerUp}
            onPointerCancel={drag.onPointerUp}
            aria-hidden="true"
          >
            <div className="h-1.5 w-12 rounded-full bg-border-strong/40" />
          </div>

          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-default px-5 py-3 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-lg font-bold tracking-tight text-text-primary sm:text-xl">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-xs text-text-secondary sm:text-sm">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-raised text-text-secondary transition-all hover:bg-surface-muted hover:text-text-primary active-bounce">
              <X size={18} />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scroll-padding-bottom:6rem] sm:px-6 sm:py-5",
              bodyClassName,
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t border-border-default bg-bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface FormDrawerActionsProps {
  /** id of the <form> this submit button belongs to (the button sits outside the form element). */
  formId?: string;
  /** For dialogs without a <form>: called when the submit button is pressed. */
  onSubmit?: () => void;
  submitLabel: ReactNode;
  pendingLabel?: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  cancelLabel?: string;
  onCancel: () => void;
  /** Error text shown above the buttons. */
  error?: string | null;
}

/** The usual Cancel + Submit pair: full-width stacked on phones, right-aligned on desktop. */
export function FormDrawerActions({
  formId,
  onSubmit,
  submitLabel,
  pendingLabel = "Saving…",
  pending = false,
  disabled = false,
  cancelLabel = "Cancel",
  onCancel,
  error,
}: FormDrawerActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p role="alert" className="text-sm text-bad-fg">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 w-full active-bounce sm:w-auto">
          {cancelLabel}
        </Button>
        <Button
          type={formId ? "submit" : "button"}
          form={formId}
          onClick={formId ? undefined : onSubmit}
          disabled={pending || disabled}
          className="h-11 w-full active-bounce sm:w-auto"
        >
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
