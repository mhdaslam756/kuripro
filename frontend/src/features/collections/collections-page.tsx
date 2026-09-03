import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectTab } from "./collect-tab";
import { HistoryTab } from "./history-tab";

export function CollectionsPage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Collections & Receipts</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-text-secondary">
          Raise dues, collect installments with one tap, issue instant receipts, and reconcile payments.
        </p>
      </div>

        <Tabs defaultValue="Collect" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2 rounded-2xl p-1 bg-bg-raised">
            <TabsTrigger value="Collect" className="rounded-xl font-bold text-xs py-2">Collect Dues</TabsTrigger>
            <TabsTrigger value="History" className="rounded-xl font-bold text-xs py-2">Collection History</TabsTrigger>
          </TabsList>
          <TabsContent value="Collect">
            <CollectTab />
          </TabsContent>
          <TabsContent value="History">
            <HistoryTab />
          </TabsContent>
        </Tabs>
    </div>
  );
}
