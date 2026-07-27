export const MEMBER_STATUSES = ["ACTIVE", "INACTIVE", "BLACKLISTED"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const OCCUPATION_TYPES = [
  "SALARIED",
  "SELF_EMPLOYED",
  "BUSINESS_OWNER",
  "HOMEMAKER",
  "STUDENT",
  "RETIRED",
  "UNEMPLOYED",
  "OTHER",
] as const;
export type OccupationType = (typeof OCCUPATION_TYPES)[number];

export const KYC_STATUSES = ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const DOCUMENT_CATEGORIES = ["KYC", "AGREEMENT", "BANK_PROOF", "PHOTO", "OTHER"] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const RISK_BANDS = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskBand = (typeof RISK_BANDS)[number];

export const NOMINEE_RELATIONS = [
  "SPOUSE",
  "SON",
  "DAUGHTER",
  "FATHER",
  "MOTHER",
  "BROTHER",
  "SISTER",
  "OTHER",
] as const;
export type NomineeRelation = (typeof NOMINEE_RELATIONS)[number];

export const FAMILY_RELATIONS = [
  "SPOUSE",
  "FATHER",
  "MOTHER",
  "SON",
  "DAUGHTER",
  "BROTHER",
  "SISTER",
  "GUARDIAN",
  "OTHER",
] as const;
export type FamilyRelation = (typeof FAMILY_RELATIONS)[number];

export const GUARANTOR_TYPES = ["EXISTING_MEMBER", "EXTERNAL"] as const;
export type GuarantorType = (typeof GUARANTOR_TYPES)[number];

export interface MemberAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  formattedAddress?: string;
}

export interface MemberOccupation {
  type: OccupationType;
  employerOrBusinessName?: string;
  monthlyIncome?: number;
  workAddress?: string;
}

export interface MemberDocumentEntry {
  id: string;
  category: DocumentCategory;
  type: string;
  url: string;
  publicId: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface MemberKyc {
  status: KycStatus;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  aadhaarLast4?: string;
  panNumber?: string;
}

export interface RiskScoreFactor {
  label: string;
  points: number;
}

export interface MemberRiskScore {
  value: number;
  band: RiskBand;
  computedAt: string;
  factors: RiskScoreFactor[];
}

export interface Member {
  id: string;
  memberCode: string;
  userId?: string | null;
  branchId?: string;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  dateOfBirth?: string;
  gender?: Gender;
  occupation: MemberOccupation;
  address: MemberAddress;
  kyc: MemberKyc;
  documents: MemberDocumentEntry[];
  riskScore?: MemberRiskScore;
  qrToken: string;
  status: MemberStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMembers {
  items: Member[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Nominee {
  id: string;
  memberId: string;
  name: string;
  relation: NomineeRelation;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  idProofType?: string;
  idProofNumber?: string;
  sharePercent: number;
  isActive: boolean;
}

export interface ExternalGuarantorDetails {
  name: string;
  phone: string;
  address?: string;
  occupation?: string;
  idProofType?: string;
  idProofNumber?: string;
}

export interface Guarantor {
  id: string;
  memberId: string;
  guarantorType: GuarantorType;
  guarantorMemberId?: string;
  external?: ExternalGuarantorDetails;
  relationToMember?: string;
  status: "ACTIVE" | "REMOVED";
  addedAt: string;
}

export interface FamilyMember {
  id: string;
  memberId: string;
  name: string;
  relation: FamilyRelation;
  dateOfBirth?: string;
  occupation?: string;
  phone?: string;
  isDependent: boolean;
}

export interface PaymentHistoryEntry {
  id: string;
  tenantId?: string;
  chitGroupId?: string;
  chitCycleId?: string;
  chitMembershipId?: string;
  ticketNumber?: number;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  paidAt?: string;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "WAIVED";
  method?: string;
}

export interface PaginatedPayments {
  items: PaymentHistoryEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PrizeHistoryEntry {
  chitGroupName: string;
  cycleNumber: number;
  prizeAmount?: number;
  settledAt?: string;
  payoutStatus: string;
  disbursedAt?: string;
}

export interface TimelineEvent {
  type: string;
  message: string;
  occurredAt: string;
}

export interface PaginatedTimeline {
  items: TimelineEvent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CsvRowReport {
  row: number;
  status: "OK" | "ERROR";
  errors: string[];
  name?: string;
  phone?: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  reports: CsvRowReport[];
}

export interface ImportCommitResult {
  created: number;
  skipped: number;
  reports: CsvRowReport[];
}
