import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import { formatPaiseAsINR } from "../../utils/money.js";

export interface ExportColumn {
  key: string;
  label: string;
  /** When true, the cell value is integer paise — rendered as rupees in exports. */
  money?: boolean;
}

export interface ExportTable {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  /** Optional totals row (keyed by column key). */
  totals?: Record<string, unknown>;
}

export type ExportFormat = "csv" | "excel" | "pdf";

function cellText(value: unknown, money?: boolean): string {
  if (value === null || value === undefined) return "";
  if (money && typeof value === "number") return formatPaiseAsINR(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(table: ExportTable): string {
  const lines = [table.columns.map((c) => csvEscape(c.label)).join(",")];
  for (const row of table.rows) {
    lines.push(
      table.columns
        .map((c) => {
          const value = row[c.key];
          // For CSV, money is a plain rupee number so spreadsheets can sum it.
          if (c.money && typeof value === "number") return String(value / 100);
          return csvEscape(cellText(value));
        })
        .join(","),
    );
  }
  if (table.totals) {
    lines.push(
      table.columns
        .map((c) => {
          const value = table.totals?.[c.key];
          if (value === undefined) return "";
          if (c.money && typeof value === "number") return String(value / 100);
          return csvEscape(cellText(value));
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

export async function toExcel(table: ExportTable): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "KuriPro";
  const sheet = workbook.addWorksheet(table.title.slice(0, 31) || "Report");

  sheet.columns = table.columns.map((c) => ({ header: c.label, key: c.key, width: c.money ? 16 : 22 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of table.rows) {
    const values: Record<string, unknown> = {};
    for (const c of table.columns) {
      const value = row[c.key];
      values[c.key] = c.money && typeof value === "number" ? value / 100 : value instanceof Date ? value : (value ?? "");
    }
    sheet.addRow(values);
  }

  if (table.totals) {
    const values: Record<string, unknown> = {};
    for (const c of table.columns) {
      const value = table.totals[c.key];
      values[c.key] = c.money && typeof value === "number" ? value / 100 : (value ?? "");
    }
    const totalRow = sheet.addRow(values);
    totalRow.font = { bold: true };
  }

  // Rupee number format on money columns.
  table.columns.forEach((c, index) => {
    if (c.money) sheet.getColumn(index + 1).numFmt = '#,##0.00;[Red]-#,##0.00';
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function toPdf(table: ExportTable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor("#8a6d3b").font("Helvetica-Bold").fontSize(16).text(table.title);
    if (table.subtitle) doc.fillColor("#6b6b6b").font("Helvetica").fontSize(9).text(table.subtitle);
    doc.moveDown(0.6);

    const pageWidth = doc.page.width - 80;
    const colWidth = pageWidth / table.columns.length;
    const rowHeight = 18;

    function drawRow(cells: string[], y: number, bold: boolean): void {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(bold ? "#2b2b2b" : "#333");
      cells.forEach((text, i) => {
        doc.text(text, 40 + i * colWidth + 2, y + 5, { width: colWidth - 4, height: rowHeight, ellipsis: true });
      });
    }

    let y = doc.y;
    doc.rect(40, y, pageWidth, rowHeight).fill("#f0ebe0");
    drawRow(table.columns.map((c) => c.label), y, true);
    y += rowHeight;

    for (const row of table.rows) {
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage();
        y = 40;
        doc.rect(40, y, pageWidth, rowHeight).fill("#f0ebe0");
        drawRow(table.columns.map((c) => c.label), y, true);
        y += rowHeight;
      }
      drawRow(table.columns.map((c) => cellText(row[c.key], c.money)), y, false);
      doc.moveTo(40, y + rowHeight).lineTo(40 + pageWidth, y + rowHeight).strokeColor("#e5e0d5").lineWidth(0.5).stroke();
      y += rowHeight;
    }

    if (table.totals) {
      drawRow(
        table.columns.map((c) => (table.totals?.[c.key] !== undefined ? cellText(table.totals[c.key], c.money) : "")),
        y,
        true,
      );
    }

    doc.end();
  });
}

export function renderExport(table: ExportTable, format: ExportFormat): Promise<Buffer> | Buffer {
  if (format === "csv") return Buffer.from(toCsv(table), "utf-8");
  if (format === "excel") return toExcel(table);
  return toPdf(table);
}

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export const EXPORT_EXTENSIONS: Record<ExportFormat, string> = { csv: "csv", excel: "xlsx", pdf: "pdf" };
