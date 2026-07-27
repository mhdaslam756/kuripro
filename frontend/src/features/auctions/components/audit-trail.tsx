import { Circle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, humanize } from "@/lib/format";
import { useAuditTrail } from "../use-auctions";

export function AuditTrail({ cycleId }: { cycleId: string }) {
  const { data: events, isLoading } = useAuditTrail(cycleId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!events || events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border-default py-8 text-center">
        <p className="text-sm text-text-secondary">No auction activity recorded yet.</p>
      </div>
    );
  }

  return (
    <ol className="relative flex flex-col gap-0 border-l border-border-default pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative pb-5 last:pb-0">
          <Circle size={9} className="absolute -left-[28px] top-1 fill-accent-primary text-accent-primary" />
          <p className="text-sm text-text-primary">{event.message}</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {humanize(event.type)} · {formatDateTime(event.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
