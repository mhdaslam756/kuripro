import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileCard({ children, className, onClick }: MobileCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "rounded-2xl border-border-default/80 bg-bg-surface p-4 shadow-xs transition-all",
        isClickable && "cursor-pointer active:scale-[0.98] active:bg-bg-raised",
        className
      )}
    >
      {children}
    </Card>
  );
}
