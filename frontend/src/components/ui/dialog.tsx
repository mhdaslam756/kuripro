import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] w-full overflow-y-auto rounded-t-[32px] border-t border-border-default bg-bg-surface p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl focus:outline-none animate-in slide-in-from-bottom duration-250 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[88vh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6",
        className,
      )}
      {...props}
    >
      {/* Mobile Bottom Sheet Handle */}
      <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-border-strong/30 sm:hidden" />
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-bg-raised text-text-secondary hover:bg-surface-muted hover:text-text-primary active-bounce">
        <X size={18} />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1", className)} {...props} />;
}

export const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-lg font-semibold text-text-primary", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-text-secondary", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
