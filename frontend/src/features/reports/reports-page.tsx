import { useState } from "react";

import { MobileHeader } from "@/components/mobile/mobile-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from "./components/report-shared";
import { AuctionsTab } from "./tabs/auctions-tab";
import { BookTab } from "./tabs/book-tab";
import { CollectionsTab } from "./tabs/collections-tab";
import { DefaultersTab } from "./tabs/defaulters-tab";
import { FinanceReportTab } from "./tabs/finance-report-tab";
import { MembersTab } from "./tabs/members-tab";
import { OverviewTab } from "./tabs/overview-tab";
import { PayoutTab } from "./tabs/payout-tab";
import { ProfitTab } from "./tabs/profit-tab";

const TABS = [
  "Monthly",
  "Collections",
  "Defaulters",
  "Members",
  "Auctions",
  "Payout",
  "Cashbook",
  "Bank",
  "Income",
  "Expense",
  "Profit",
] as const;

function defaultRange(): DateRange {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: first.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

export function ReportsPage() {
  // A single date range is shared across every report tab, so switching tabs keeps the period.
  const [range, setRange] = useState<DateRange>(defaultRange);

  return (
    <div>
      {/* Mobile Top App Bar */}
      <MobileHeader title="Analytics & Reports" subtitle="Exportable financial & operational audit reports" />

      <div className="p-4 sm:p-0">
        <div className="mb-6 hidden sm:block">
          <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">Financial & Operational Reports</h1>
          <p className="text-sm text-text-secondary">
            Operational and financial reports with charts — export any of them to PDF, Excel or CSV.
          </p>
        </div>

        <Tabs defaultValue="Monthly" className="w-full">
          <div className="overflow-x-auto pb-2 hide-scrollbar">
            <TabsList className="inline-flex w-auto shrink-0 gap-1 rounded-2xl p-1 bg-bg-raised">
              {TABS.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="rounded-xl font-bold text-xs px-3.5 py-1.5 whitespace-nowrap">
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

        <TabsContent value="Monthly">
          <OverviewTab range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Collections">
          <CollectionsTab range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Defaulters">
          <DefaultersTab range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Members">
          <MembersTab range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Auctions">
          <AuctionsTab range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Payout">
          <PayoutTab range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Cashbook">
          <BookTab kind="cashbook" range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Bank">
          <BookTab kind="bank" range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Income">
          <FinanceReportTab kind="income" range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Expense">
          <FinanceReportTab kind="expense" range={range} onRangeChange={setRange} />
        </TabsContent>
        <TabsContent value="Profit">
          <ProfitTab range={range} onRangeChange={setRange} />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
