import { useState } from "react";

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
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Reports</h1>
        <p className="text-sm text-text-secondary">
          Operational and financial reports with charts — export any of them to PDF, Excel or CSV.
        </p>
      </div>

      <Tabs defaultValue="Monthly">
        <TabsList className="flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

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
  );
}
