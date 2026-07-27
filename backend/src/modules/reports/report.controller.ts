import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import { EXPORT_CONTENT_TYPES, EXPORT_EXTENSIONS, renderExport } from "./export.util.js";
import * as reportService from "./report.service.js";
import type { ReportParams, ReportType } from "./report.service.js";
import type { ReportExportQuery, ReportParamsQuery, ReportTypeParam } from "./report.validators.js";

async function runReport(tenantId: string, type: ReportType, params: ReportParams): Promise<unknown> {
  switch (type) {
    case "monthly":
      return reportService.getMonthly(tenantId, params);
    case "collections":
      return reportService.getCollections(tenantId, params);
    case "defaulters":
      return reportService.getDefaulters(tenantId, params);
    case "members":
      return reportService.getMembers(tenantId, params);
    case "auctions":
      return reportService.getAuctions(tenantId, params);
    case "payout":
      return reportService.getPayout(tenantId, params);
    case "cashbook":
      return reportService.getCashbook(tenantId, params);
    case "bank":
      return reportService.getBank(tenantId, params);
    case "income":
      return reportService.getIncome(tenantId, params);
    case "expense":
      return reportService.getExpense(tenantId, params);
    case "profit":
      return reportService.getProfit(tenantId, params);
    default:
      throw AppError.badRequest("Unknown report type");
  }
}

export async function getReport(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { type } = req.params as unknown as ReportTypeParam;
  const query = req.query as unknown as ReportParamsQuery;
  const report = await runReport(tenantId, type, {
    from: query.from,
    to: query.to,
    chitGroupId: query.chitGroupId,
  });
  res.status(200).json({ report });
}

export async function exportReport(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { type } = req.params as unknown as ReportTypeParam;
  const query = req.query as unknown as ReportExportQuery;

  const table = await reportService.buildExportTable(tenantId, type, {
    from: query.from,
    to: query.to,
    chitGroupId: query.chitGroupId,
  });
  const buffer = await renderExport(table, query.format);

  const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.${EXPORT_EXTENSIONS[query.format]}`;
  res.setHeader("Content-Type", EXPORT_CONTENT_TYPES[query.format]);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(buffer);
}
