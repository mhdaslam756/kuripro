import { AlertCircle, CheckCircle2, FileUp } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api-client";
import type { CsvRowReport, ImportCommitResult, ImportPreviewResult } from "../types";
import { useCommitImport, usePreviewImport } from "../use-members";

const TEMPLATE_HEADERS = [
  "name",
  "phone",
  "email",
  "gender",
  "dateOfBirth",
  "occupationType",
  "employerOrBusinessName",
  "monthlyIncomeRupees",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pincode",
  "branchCode",
];

const TEMPLATE_SAMPLE =
  "Anita Sharma,9876543210,anita@example.com,FEMALE,1990-05-14,SALARIED,Infosys,55000,12 MG Road,,Kochi,Kerala,682001,";

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS.join(",")}\n${TEMPLATE_SAMPLE}\n`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "members-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ReportTable({ reports }: { reports: CsvRowReport[] }) {
  const shown = reports.slice(0, 100);
  return (
    <TableContainer className="max-h-64 overflow-y-auto">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Row</TableHeaderCell>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Issues</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shown.map((report) => (
            <TableRow key={report.row}>
              <TableCell>{report.row}</TableCell>
              <TableCell>{report.name ?? "—"}</TableCell>
              <TableCell>
                {report.status === "OK" ? (
                  <span className="inline-flex items-center gap-1 text-good-fg">
                    <CheckCircle2 size={14} /> OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-bad-fg">
                    <AlertCircle size={14} /> Error
                  </span>
                )}
              </TableCell>
              <TableCell className="text-text-secondary">{report.errors.join("; ") || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [committed, setCommitted] = useState<ImportCommitResult | null>(null);

  const previewImport = usePreviewImport();
  const commitImport = useCommitImport();

  function reset() {
    setFile(null);
    setPreview(null);
    setCommitted(null);
    previewImport.reset();
    commitImport.reset();
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handlePreview() {
    if (!file) return;
    setCommitted(null);
    const result = await previewImport.mutateAsync(file);
    setPreview(result);
  }

  async function handleCommit() {
    if (!file) return;
    const result = await commitImport.mutateAsync(file);
    setCommitted(result);
    setPreview(null);
  }

  const error = previewImport.error ?? commitImport.error;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk import members</DialogTitle>
          <DialogDescription>
            Upload a CSV to register many members at once. Valid rows are imported; invalid rows are skipped and
            reported so you can fix and re-upload just those.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={downloadTemplate}
            className="self-start text-sm font-medium text-accent-primary hover:underline"
          >
            Download CSV template
          </button>

          <label
            htmlFor="csv-file"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border-default bg-bg-raised px-4 py-8 text-center"
          >
            <FileUp className="text-text-secondary" size={24} />
            <span className="text-sm text-text-primary">{file ? file.name : "Choose a .csv file"}</span>
            <span className="text-xs text-text-secondary">Max 5MB</span>
            <input
              id="csv-file"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setCommitted(null);
              }}
            />
          </label>

          {preview ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-secondary">
                {preview.totalRows} rows · <span className="text-good-fg">{preview.validRows} valid</span> ·{" "}
                <span className="text-bad-fg">{preview.errorRows} with errors</span>
              </p>
              <ReportTable reports={preview.reports} />
            </div>
          ) : null}

          {committed ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                <span className="text-good-fg">{committed.created} created</span> ·{" "}
                <span className="text-text-secondary">{committed.skipped} skipped</span>
              </p>
              <ReportTable reports={committed.reports.filter((report) => report.status === "ERROR")} />
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-bad-fg">{error instanceof ApiError ? error.message : "Something went wrong"}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              {committed ? "Done" : "Cancel"}
            </Button>
            {!committed ? (
              <>
                <Button type="button" variant="secondary" disabled={!file || previewImport.isPending} onClick={() => void handlePreview()}>
                  {previewImport.isPending ? "Checking…" : "Preview"}
                </Button>
                <Button
                  type="button"
                  disabled={!file || commitImport.isPending || (preview !== null && preview.validRows === 0)}
                  onClick={() => void handleCommit()}
                >
                  {commitImport.isPending ? "Importing…" : "Import"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
