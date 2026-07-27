import { CheckCircle2, Info } from "lucide-react";

import { CHANNEL_LABELS, type ChannelAvailability } from "../types";

/**
 * Shows which delivery channels have provider credentials configured. Unconfigured channels still
 * "work" in development — the server logs the message to its console instead of calling a provider —
 * so the note explains that honest-gap behaviour rather than hiding the channel.
 */
export function ChannelAvailabilityBanner({ channels }: { channels: ChannelAvailability[] }) {
  const anyUnconfigured = channels.some((c) => !c.configured);
  return (
    <div className="rounded-md border border-border-default bg-surface-muted p-4">
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        {channels.map((c) => (
          <span key={c.channel} className="inline-flex items-center gap-1.5 text-sm">
            {c.configured ? (
              <CheckCircle2 className="size-4 text-good-fg" aria-hidden />
            ) : (
              <Info className="size-4 text-text-secondary" aria-hidden />
            )}
            <span className="font-medium text-text-primary">{CHANNEL_LABELS[c.channel]}</span>
            <span className="text-text-secondary">{c.configured ? "connected" : "not configured"}</span>
          </span>
        ))}
      </div>
      {anyUnconfigured ? (
        <p className="text-xs text-text-secondary">
          Channels marked <em>not configured</em> have no provider credentials on this server. In
          development they're logged to the server console so you can still test; in production they'll
          be marked failed until credentials are added.
        </p>
      ) : (
        <p className="text-xs text-text-secondary">All channels are connected and ready to deliver.</p>
      )}
    </div>
  );
}
