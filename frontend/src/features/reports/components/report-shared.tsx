import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import type { ExportFormat } from "../types";

export interface DateRange {
  from: string;
  to: string;
}

interface ToolbarProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
  onExport: (format: ExportFormat) => Promise<void>;
  showDates?: boolean;
}

export function ReportToolbar({ range, onChange, onExport, showDates = true }: ToolbarProps) {
  const { hasPermission } = useAuth();
  const canExport = hasPermission("report.export");
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    setBusy(format);
    try {
      await onExport(format);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      {showDates ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">From</p>
            <Input type="date" className="w-40" value={range.from} onChange={(e) => onChange({ ...range, from: e.target.value })} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">To</p>
            <Input type="date" className="w-40" value={range.to} onChange={(e) => onChange({ ...range, to: e.target.value })} />
          </div>
        </div>
      ) : (
        <div />
      )}
      {canExport ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void handleExport("pdf")}>
            <FileText size={15} /> {busy === "pdf" ? "…" : "PDF"}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void handleExport("excel")}>
            <FileSpreadsheet size={15} /> {busy === "excel" ? "…" : "Excel"}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void handleExport("csv")}>
            <Download size={15} /> {busy === "csv" ? "…" : "CSV"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-md border border-border-default bg-bg-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${tone ?? "text-text-primary"}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-text-secondary">{sub}</p> : null}
    </div>
  );
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border-default bg-bg-surface p-5">
      <h3 className="mb-4 font-display text-base font-semibold text-text-primary">{title}</h3>
      {children}
    </div>
  );
}

export function EmptyReport({ label = "No data for this period." }: { label?: string }) {
  return (
    <div className="rounded-md border border-dashed border-border-default py-14 text-center">
      <p className="text-sm text-text-secondary">{label}</p>
    </div>
  );
}
