import { CheckCircle2 } from "lucide-react";

import type { SendResult } from "../types";

export function SendResultBanner({ result }: { result: SendResult }) {
  return (
    <div className="rounded-md border border-good-border bg-good-bg p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-good-fg" aria-hidden />
        <p className="font-medium text-good-fg">
          Queued {result.queued} notification{result.queued === 1 ? "" : "s"} for delivery
        </p>
      </div>
      {result.skipped.length > 0 ? (
        <ul className="mt-2 ml-7 list-disc text-sm text-text-secondary">
          {result.skipped.map((s, i) => (
            <li key={i}>
              Skipped {s.count} — {s.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
