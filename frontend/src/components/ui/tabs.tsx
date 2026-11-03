import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex gap-1 overflow-x-auto border-b border-border-default [scrollbar-width:none]",
      // Phones: a segmented control instead of an underlined strip
      "max-lg:rounded-2xl max-lg:border-0 max-lg:bg-bg-raised max-lg:p-1",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors",
      "hover:bg-brand-50/60 hover:text-text-primary",
      "data-[state=active]:border-accent-primary data-[state=active]:text-accent-primary",
      "max-lg:flex-1 max-lg:rounded-xl max-lg:border-b-0 max-lg:py-2 max-lg:text-center max-lg:hover:bg-transparent",
      "max-lg:data-[state=active]:bg-accent-primary max-lg:data-[state=active]:text-white max-lg:data-[state=active]:shadow-sm",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("pt-5 focus:outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
