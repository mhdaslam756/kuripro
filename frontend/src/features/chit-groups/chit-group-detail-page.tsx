import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPaise } from "@/lib/format";
import { ChitStatusBadge } from "./components/chit-badges";
import { CollectTab } from "@/features/collections/collect-tab";
import { AuctionTab } from "./tabs/auction-tab";
import { DocumentsTab } from "./tabs/documents-tab";
import { MembersTab } from "./tabs/members-tab";
import { OverviewTab } from "./tabs/overview-tab";
import { ReportsTab } from "./tabs/reports-tab";
import { ScheduleTab } from "./tabs/schedule-tab";
import { TermsTab } from "./tabs/terms-tab";
import { FREQUENCY_LABELS } from "./types";
import { useChitGroup } from "./use-chit-groups";

const TABS = ["Overview", "Collections", "Schedule", "Members", "Auction Rules", "Documents", "Terms", "Reports"] as const;

export function ChitGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: chit, isLoading, isError } = useChitGroup(id);

  return (
    <div>
      <Link
        to="/chit-groups"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={15} /> All chit groups
      </Link>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !chit ? (
        <p className="text-sm text-bad-fg">Couldn't load this chit group.</p>
      ) : (
        <>
          <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold text-text-primary">{chit.name}</h1>
              <p className="mt-1 text-sm text-text-secondary">
                <span className="font-mono">{chit.registrationNumber}</span> · {formatPaise(chit.chitValue)} ·{" "}
                {chit.totalMembers} members · {FREQUENCY_LABELS[chit.frequency]}
              </p>
            </div>
            <ChitStatusBadge status={chit.status} />
          </header>

          <Tabs defaultValue="Overview">
            <div className="overflow-x-auto hide-scrollbar pb-1 mb-4">
              <TabsList className="inline-flex min-w-full sm:min-w-0 sm:flex-wrap">
                {TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="shrink-0 active-bounce">
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="Overview">
              <OverviewTab chitGroup={chit} />
            </TabsContent>
            <TabsContent value="Collections">
              <CollectTab initialGroupId={chit.id} />
            </TabsContent>
            <TabsContent value="Schedule">
              <ScheduleTab chitGroup={chit} />
            </TabsContent>
            <TabsContent value="Members">
              <MembersTab chitGroup={chit} />
            </TabsContent>
            <TabsContent value="Auction Rules">
              <AuctionTab chitGroup={chit} />
            </TabsContent>
            <TabsContent value="Documents">
              <DocumentsTab chitGroup={chit} />
            </TabsContent>
            <TabsContent value="Terms">
              <TermsTab chitGroup={chit} />
            </TabsContent>
            <TabsContent value="Reports">
              <ReportsTab chitGroupId={chit.id} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
