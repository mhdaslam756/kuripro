import { AlertCircle, FolderOpen, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MobileEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function MobileEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: MobileEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-border-default/80 bg-bg-surface p-8 text-center shadow-xs",
        className
      )}
    >
      <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-accent-primary">
        {icon || <FolderOpen size={28} />}
      </div>
      <h3 className="font-display text-base font-bold text-text-primary">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-text-secondary leading-relaxed">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export interface MobileErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function MobileErrorState({
  title = "Something went wrong",
  message = "We couldn't load this information. Please try again.",
  onRetry,
  className,
}: MobileErrorStateProps) {
  return (
    <Alert className={cn("rounded-2xl border-bad-border/60 bg-bad-bg/15 p-4 text-bad-fg", className)}>
      <AlertCircle className="h-5 w-5 shrink-0 text-bad-fg" />
      <div className="ml-3 flex-1">
        <AlertTitle className="font-bold text-sm text-bad-fg">{title}</AlertTitle>
        <AlertDescription className="mt-1 text-xs text-bad-fg/90">{message}</AlertDescription>
        {onRetry ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="mt-3 gap-1.5 rounded-xl border-bad-border bg-bg-surface text-xs font-semibold text-bad-fg hover:bg-bad-bg"
          >
            <RefreshCw size={13} /> Try Again
          </Button>
        ) : null}
      </div>
    </Alert>
  );
}

export interface MobileStatusBadgeProps {
  status: string;
  variant?: "neutral" | "success" | "warning" | "danger" | "info" | "brand";
  className?: string;
}

export function MobileStatusBadge({ status, variant = "neutral", className }: MobileStatusBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn("px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider", className)}
    >
      {status}
    </Badge>
  );
}
