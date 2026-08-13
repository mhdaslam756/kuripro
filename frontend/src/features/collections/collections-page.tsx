import { MobileHeader } from "@/components/mobile/mobile-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectTab } from "./collect-tab";
import { HistoryTab } from "./history-tab";

export function CollectionsPage() {
  return (
    <div>
      {/* Mobile Top App Bar */}
      <MobileHeader
        title="Collections"
        subtitle="Collect installments & issue receipts"
      />

      <div className="p-4 sm:p-0">
        <div className="mb-6 hidden sm:block">
          <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">Collections & Receipts</h1>
          <p className="text-sm text-text-secondary">
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
    </div>
  );
}
