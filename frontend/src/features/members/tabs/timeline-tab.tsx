import { Circle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, humanize } from "@/lib/format";
import { useTimeline } from "../use-members";
import { EmptyState } from "./nominees-tab";

export function TimelineTab({ memberId }: { memberId: string }) {
  const { data, isLoading } = useTimeline(memberId);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.items.length === 0) {
    return <EmptyState label="No activity recorded for this member yet." />;
  }

  return (
    <ol className="relative flex flex-col gap-0 border-l border-border-default pl-6">
      {data.items.map((event, index) => (
        <li key={index} className="relative pb-6 last:pb-0">
          <Circle
            size={10}
            className="absolute -left-[29px] top-1 fill-accent-primary text-accent-primary"
          />
          <p className="text-sm font-medium text-text-primary">{event.message}</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {humanize(event.type)} · {formatDateTime(event.occurredAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
