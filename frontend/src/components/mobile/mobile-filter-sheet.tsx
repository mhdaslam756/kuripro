import { Filter, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount?: number;
  onReset?: () => void;
  onApply?: () => void;
  children: ReactNode;
  title?: string;
  trigger?: ReactNode;
}

export function MobileFilterSheet({
  open,
  onOpenChange,
  activeCount = 0,
  onReset,
  onApply,
  children,
  title = "Filter Options",
  trigger,
}: MobileFilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      ) : (
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative gap-1.5 rounded-full border-border-default px-3 py-1.5 text-xs font-semibold"
          >
            <Filter size={14} /> Filter
            {activeCount > 0 ? (
              <Badge variant="brand" className="ml-0.5 px-1.5 py-0 text-[10px]">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>
      )}

      <SheetContent side="bottom" className="flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border-default/80 px-5 pt-3 pb-3">
          <SheetHeader className="text-left space-y-0.5">
            <SheetTitle className="text-base font-bold text-text-primary flex items-center gap-2">
              <Filter size={16} className="text-accent-primary" /> {title}
            </SheetTitle>
            <SheetDescription className="text-xs text-text-secondary">
              Refine your search results
            </SheetDescription>
          </SheetHeader>
          {onReset ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 gap-1 rounded-xl px-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              <RotateCcw size={12} /> Reset
            </Button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {children}
        </div>

        <div className="border-t border-border-default/80 bg-bg-surface p-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button
            size="lg"
            onClick={() => {
              if (onApply) onApply();
              onOpenChange(false);
            }}
            className="w-full h-11 rounded-2xl font-bold shadow-sm"
          >
            Apply Filters {activeCount > 0 ? `(${activeCount})` : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
