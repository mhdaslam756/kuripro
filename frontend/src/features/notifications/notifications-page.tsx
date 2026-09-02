import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { ChannelAvailabilityBanner } from "./components/channel-availability";
import { MemberNotificationsView } from "./components/member-notifications-view";
import { BulkTab } from "./tabs/bulk-tab";
import { HistoryTab } from "./tabs/history-tab";
import { SendTab } from "./tabs/send-tab";
import { TemplatesTab } from "./tabs/templates-tab";
import type { NotificationStats } from "./types";
import { useNotificationMeta, useTemplates } from "./use-notifications";

const STAT_CARDS: { key: keyof Omit<NotificationStats, "byChannel">; label: string; tone: string }[] = [
  { key: "total", label: "Total sent", tone: "text-text-primary" },
  { key: "sent", label: "Delivered", tone: "text-good-fg" },
  { key: "queued", label: "In progress", tone: "text-info-fg" },
  { key: "failed", label: "Failed", tone: "text-bad-fg" },
];

function OrganizerNotificationsView() {
  const { data: templates } = useTemplates();
  const { data: meta } = useNotificationMeta();
  const activeTemplates = (templates ?? []).filter((t) => t.isActive);

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Notifications</h1>
        <p className="text-sm text-text-secondary">
          Reach members over WhatsApp, SMS, push and email — one at a time or in bulk — with reusable templates.
        </p>
      </div>

      {/* Stats + channel availability */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="rounded-md border border-border-default bg-surface p-4">
              <p className="text-xs uppercase tracking-wide text-text-secondary">{card.label}</p>
              {meta ? (
                <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${card.tone}`}>{meta.stats[card.key]}</p>
              ) : (
                <Skeleton className="mt-1 h-8 w-12" />
              )}
            </div>
          ))}
        </div>
        {meta ? <ChannelAvailabilityBanner channels={meta.channels} /> : <Skeleton className="h-32 w-full" />}
      </div>

      <Tabs defaultValue="send">
        <TabsList>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="bulk">Bulk</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <SendTab templates={activeTemplates} />
        </TabsContent>
        <TabsContent value="bulk">
          <BulkTab templates={activeTemplates} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();

  if (user?.role?.slug === "MEMBER") {
    return <MemberNotificationsView />;
  }

  return <OrganizerNotificationsView />;
}
