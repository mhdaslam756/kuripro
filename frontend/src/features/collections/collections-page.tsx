import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectTab } from "./collect-tab";
import { HistoryTab } from "./history-tab";

export function CollectionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Collections</h1>
        <p className="text-sm text-text-secondary">
          Raise dues, collect installments with one tap, issue receipts, and reconcile payments.
        </p>
      </div>

      <Tabs defaultValue="Collect">
        <TabsList>
          <TabsTrigger value="Collect">Collect</TabsTrigger>
          <TabsTrigger value="History">History</TabsTrigger>
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
