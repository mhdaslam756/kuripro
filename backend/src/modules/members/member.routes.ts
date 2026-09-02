import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema, nestedMongoIdParamSchema } from "../../utils/common-validators.js";
import { paginationQuerySchema } from "../../utils/pagination.js";
import * as memberController from "./member.controller.js";
import { uploadMemberCsv } from "./member-csv-upload.middleware.js";
import {
  addMemberDocumentSchema,
  createFamilyMemberSchema,
  createGuarantorSchema,
  createMemberSchema,
  createNomineeSchema,
  inviteMemberSchema,
  listMembersQuerySchema,
  rejectKycSchema,
  submitKycIdentitySchema,
  updateFamilyMemberSchema,
  updateMemberSchema,
  updateNomineeSchema,
} from "./member.validators.js";

export const memberRouter: Router = Router();

memberRouter.use(requireAuth);

// --- Collection-level & static paths (declared before "/:id" so they aren't swallowed by it) ---

memberRouter.post(
  "/",
  requirePermission("members.create"),
  validate({ body: createMemberSchema }),
  memberController.create,
);

memberRouter.get(
  "/",
  requirePermission("members.view"),
  validate({ query: listMembersQuerySchema }),
  memberController.list,
);

memberRouter.get(
  "/export",
  requirePermission("members.import_export"),
  validate({ query: listMembersQuerySchema }),
  memberController.exportCsv,
);

memberRouter.get("/qr-lookup", requirePermission("members.view"), memberController.lookupByQr);

memberRouter.post(
  "/import/preview",
  requirePermission("members.import_export"),
  uploadMemberCsv,
  memberController.previewImport,
);

memberRouter.post(
  "/import/commit",
  requirePermission("members.import_export"),
  uploadMemberCsv,
  memberController.commitImport,
);

// --- Single member ---

memberRouter.get("/me", memberController.getMe);

memberRouter.get(
  "/:id",
  requirePermission("members.view"),
  validate({ params: mongoIdParamSchema }),
  memberController.getById,
);

memberRouter.patch(
  "/:id",
  requirePermission("members.update"),
  validate({ params: mongoIdParamSchema, body: updateMemberSchema }),
  memberController.update,
);

memberRouter.delete(
  "/:id",
  requirePermission("members.delete"),
  validate({ params: mongoIdParamSchema }),
  memberController.deactivate,
);

memberRouter.post(
  "/:id/invite",
  requirePermission("members.update"),
  validate({ params: mongoIdParamSchema, body: inviteMemberSchema }),
  memberController.inviteToPortal,
);

// --- KYC ---

memberRouter.post(
  "/:id/kyc",
  requirePermission("members.update"),
  validate({ params: mongoIdParamSchema, body: submitKycIdentitySchema }),
  memberController.submitKyc,
);

memberRouter.post(
  "/:id/kyc/verify",
  requirePermission("members.verify_kyc"),
  validate({ params: mongoIdParamSchema }),
  memberController.verifyKyc,
);

memberRouter.post(
  "/:id/kyc/reject",
  requirePermission("members.verify_kyc"),
  validate({ params: mongoIdParamSchema, body: rejectKycSchema }),
  memberController.rejectKyc,
);

// --- Documents ---

memberRouter.post(
  "/:id/documents",
  requirePermission("members.update"),
  validate({ params: mongoIdParamSchema, body: addMemberDocumentSchema }),
  memberController.addDocument,
);

memberRouter.delete(
  "/:id/documents/:childId",
  requirePermission("members.update"),
  validate({ params: nestedMongoIdParamSchema }),
  memberController.removeDocument,
);

// --- Risk score ---

memberRouter.post(
  "/:id/risk-score/recompute",
  requirePermission("members.view"),
  validate({ params: mongoIdParamSchema }),
  memberController.recomputeRiskScore,
);

// --- QR code ---

memberRouter.get(
  "/:id/qr-code",
  requirePermission("members.view"),
  validate({ params: mongoIdParamSchema }),
  memberController.getQrCode,
);

// --- History / timeline ---

memberRouter.get(
  "/:id/payments",
  requirePermission("members.view"),
  validate({ params: mongoIdParamSchema, query: paginationQuerySchema }),
  memberController.paymentHistory,
);

memberRouter.get(
  "/:id/prizes",
  requirePermission("members.view"),
  validate({ params: mongoIdParamSchema }),
  memberController.prizeHistory,
);

memberRouter.get(
  "/:id/timeline",
  requirePermission("members.view"),
  validate({ params: mongoIdParamSchema, query: paginationQuerySchema }),
  memberController.timeline,
);

// --- Nominees ---

memberRouter.get(
  "/:id/nominees",
  requirePermission("members.view"),
  validate({ params: mongoIdParamSchema }),
  memberController.listNominees,
);

memberRouter.post(
  "/:id/nominees",
  requirePermission("members.update"),
  validate({ params: mongoIdParamSchema, body: createNomineeSchema }),
  memberController.addNominee,
);

memberRouter.patch(
  "/:id/nominees/:childId",
  requirePermission("members.update"),
  validate({ params: nestedMongoIdParamSchema, body: updateNomineeSchema }),
  memberController.updateNominee,
);

memberRouter.delete(
  "/:id/nominees/:childId",
  requirePermission("members.update"),
  validate({ params: nestedMongoIdParamSchema }),
  memberController.removeNominee,
);

// --- Guarantors ---

memberRouter.get(
  "/:id/guarantors",
  requirePermission("members.view"),
  validate({ params: mongoIdParamSchema }),
  memberController.listGuarantors,
);

memberRouter.post(
  "/:id/guarantors",
  requirePermission("members.update"),
  validate({ params: mongoIdParamSchema, body: createGuarantorSchema }),
  memberController.addGuarantor,
);

memberRouter.delete(
  "/:id/guarantors/:childId",
  requirePermission("members.update"),
  validate({ params: nestedMongoIdParamSchema }),
  memberController.removeGuarantor,
);

// --- Family ---

memberRouter.get(
  "/:id/family",
  requirePermission("members.view"),
  validate({ params: mongoIdParamSchema }),
  memberController.listFamily,
);

memberRouter.post(
  "/:id/family",
  requirePermission("members.update"),
  validate({ params: mongoIdParamSchema, body: createFamilyMemberSchema }),
  memberController.addFamily,
);

memberRouter.patch(
  "/:id/family/:childId",
  requirePermission("members.update"),
  validate({ params: nestedMongoIdParamSchema, body: updateFamilyMemberSchema }),
  memberController.updateFamily,
);

memberRouter.delete(
  "/:id/family/:childId",
  requirePermission("members.update"),
  validate({ params: nestedMongoIdParamSchema }),
  memberController.removeFamily,
);
