import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MobilePageProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

/**
 * MobilePage provides a standardized container layout for mobile views (< lg),
 * handling padding, safe areas, touch momentum scrolling, and maximum width bounds.
 */
export function MobilePage({
  children,
  className,
  containerClassName,
}: MobilePageProps) {
  return (
    <div className={cn("flex flex-col gap-4 p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:p-6 lg:p-0", className)}>
      <div className={cn("mx-auto w-full max-w-[1440px]", containerClassName)}>
        {children}
      </div>
    </div>
  );
}
