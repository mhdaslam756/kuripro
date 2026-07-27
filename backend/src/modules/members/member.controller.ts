import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import type { MongoIdParam } from "../../utils/common-validators.js";
import type { PaginationQuery } from "../../utils/pagination.js";
import * as memberService from "./member.service.js";
import type {
  AddMemberDocumentInput,
  CreateFamilyMemberInput,
  CreateGuarantorInput,
  CreateMemberInput,
  CreateNomineeInput,
  InviteMemberInput,
  ListMembersQuery,
  RejectKycInput,
  SubmitKycIdentityInput,
  UpdateFamilyMemberInput,
  UpdateMemberInput,
  UpdateNomineeInput,
} from "./member.validators.js";

interface MemberIdParam {
  id: string;
}

interface NestedIdParams {
  id: string;
  childId: string;
}

export async function create(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const member = await memberService.registerMember(tenantId, req.auth!.userId, req.body as CreateMemberInput);
  res.status(201).json({ member });
}

export async function list(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await memberService.searchMembersList(tenantId, req.query as unknown as ListMembersQuery);
  res.status(200).json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const member = await memberService.getMemberById(tenantId, id);
  res.status(200).json({ member });
}

export async function update(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const member = await memberService.updateMemberProfile(
    tenantId,
    id,
    req.body as UpdateMemberInput,
    req.auth!.userId,
  );
  res.status(200).json({ member });
}

export async function deactivate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const member = await memberService.deactivateMember(tenantId, id, req.auth!.userId);
  res.status(200).json({ member });
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const query = req.query as unknown as ListMembersQuery;
  const csv = await memberService.exportMembersCsv(tenantId, {
    search: query.search,
    status: query.status,
    branchId: query.branchId,
    kycStatus: query.kycStatus,
    riskBand: query.riskBand,
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="members-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.status(200).send(csv);
}

// --- KYC ---

export async function submitKyc(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const member = await memberService.submitKycIdentity(
    tenantId,
    id,
    req.body as SubmitKycIdentityInput,
    req.auth!.userId,
  );
  res.status(200).json({ member });
}

export async function verifyKyc(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const member = await memberService.verifyMemberKyc(tenantId, id, req.auth!.userId);
  res.status(200).json({ member });
}

export async function rejectKyc(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const member = await memberService.rejectMemberKyc(tenantId, id, req.body as RejectKycInput, req.auth!.userId);
  res.status(200).json({ member });
}

// --- Documents ---

export async function addDocument(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const member = await memberService.addMemberDocument(
    tenantId,
    id,
    req.body as AddMemberDocumentInput,
    req.auth!.userId,
  );
  res.status(201).json({ member });
}

export async function removeDocument(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedIdParams;
  const member = await memberService.removeMemberDocument(tenantId, id, childId);
  res.status(200).json({ member });
}

// --- Risk score ---

export async function recomputeRiskScore(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const member = await memberService.recomputeMemberRiskScore(tenantId, id);
  res.status(200).json({ riskScore: member.riskScore });
}

// --- QR code ---

export async function getQrCode(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const result = await memberService.getMemberQrCode(tenantId, id);
  res.status(200).json(result);
}

export async function lookupByQr(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const token = (req.query as { token?: string }).token;
  if (!token) {
    throw AppError.badRequest("A 'token' query parameter is required");
  }
  const member = await memberService.lookupMemberByQrToken(tenantId, token);
  res.status(200).json({ member });
}

// --- History / timeline ---

export async function paymentHistory(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const result = await memberService.getMemberPaymentHistory(tenantId, id, req.query as unknown as PaginationQuery);
  res.status(200).json(result);
}

export async function prizeHistory(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const prizes = await memberService.getMemberPrizeHistory(tenantId, id);
  res.status(200).json({ prizes });
}

export async function timeline(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const result = await memberService.getMemberTimeline(tenantId, id, req.query as unknown as PaginationQuery);
  res.status(200).json(result);
}

// --- Portal invite ---

export async function inviteToPortal(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const { email } = req.body as InviteMemberInput;
  const result = await memberService.inviteMemberToPortal(tenantId, id, email, req.auth!.userId);
  res.status(201).json(result);
}

// --- Nominees ---

export async function listNominees(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const nominees = await memberService.listMemberNominees(tenantId, id);
  res.status(200).json({ nominees });
}

export async function addNominee(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const nominee = await memberService.addNominee(tenantId, id, req.body as CreateNomineeInput);
  res.status(201).json({ nominee });
}

export async function updateNominee(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedIdParams;
  const nominee = await memberService.updateNominee(tenantId, id, childId, req.body as UpdateNomineeInput);
  res.status(200).json({ nominee });
}

export async function removeNominee(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedIdParams;
  await memberService.removeNominee(tenantId, id, childId);
  res.status(204).send();
}

// --- Guarantors ---

export async function listGuarantors(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const guarantors = await memberService.listMemberGuarantors(tenantId, id);
  res.status(200).json({ guarantors });
}

export async function addGuarantor(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const guarantor = await memberService.addGuarantor(tenantId, id, req.body as CreateGuarantorInput);
  res.status(201).json({ guarantor });
}

export async function removeGuarantor(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedIdParams;
  const guarantor = await memberService.removeGuarantor(tenantId, id, childId);
  res.status(200).json({ guarantor });
}

// --- Family ---

export async function listFamily(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const family = await memberService.listMemberFamily(tenantId, id);
  res.status(200).json({ family });
}

export async function addFamily(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const familyMember = await memberService.addFamilyMember(tenantId, id, req.body as CreateFamilyMemberInput);
  res.status(201).json({ familyMember });
}

export async function updateFamily(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedIdParams;
  const familyMember = await memberService.updateFamilyMemberEntry(
    tenantId,
    id,
    childId,
    req.body as UpdateFamilyMemberInput,
  );
  res.status(200).json({ familyMember });
}

export async function removeFamily(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedIdParams;
  await memberService.removeFamilyMember(tenantId, id, childId);
  res.status(204).send();
}

// --- Bulk import ---

export async function previewImport(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  if (!req.file) {
    throw AppError.badRequest("No CSV file provided — send it as multipart/form-data under the 'file' field");
  }
  const reports = await memberService.previewBulkImport(tenantId, req.file.buffer);
  const errorCount = reports.filter((report) => report.status === "ERROR").length;
  res.status(200).json({ totalRows: reports.length, validRows: reports.length - errorCount, errorRows: errorCount, reports });
}

export async function commitImport(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  if (!req.file) {
    throw AppError.badRequest("No CSV file provided — send it as multipart/form-data under the 'file' field");
  }
  const result = await memberService.commitBulkImport(tenantId, req.auth!.userId, req.file.buffer);
  res.status(201).json(result);
}

export type { MemberIdParam };
