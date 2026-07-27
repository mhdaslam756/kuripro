import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

import { AppError } from "../../utils/app-error.js";
import { OCCUPATION_TYPES, type Gender, type MemberDocument, type OccupationType } from "./member.model.js";

export const MEMBER_CSV_IMPORT_COLUMNS = [
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
] as const;

export type MemberCsvRowKey = (typeof MEMBER_CSV_IMPORT_COLUMNS)[number];
export type MemberCsvRow = Record<MemberCsvRowKey, string>;

const ALPHANUMERIC_HEADER_ALIASES: Record<string, MemberCsvRowKey> = {
  // Name
  name: "name",
  fullname: "name",
  membername: "name",
  customername: "name",

  // Phone
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  mobilenumber: "phone",
  contact: "phone",
  contactnumber: "phone",

  // Email
  email: "email",
  emailaddress: "email",
  mail: "email",

  // Gender
  gender: "gender",
  sex: "gender",

  // Date of Birth
  dateofbirth: "dateOfBirth",
  dob: "dateOfBirth",
  birthdate: "dateOfBirth",

  // Occupation
  occupation: "occupationType",
  occupationtype: "occupationType",
  job: "occupationType",
  profession: "occupationType",
  work: "occupationType",

  // Employer / Business Name
  employerbusiness: "employerOrBusinessName",
  employerorbusinessname: "employerOrBusinessName",
  employer: "employerOrBusinessName",
  employername: "employerOrBusinessName",
  businessname: "employerOrBusinessName",
  business: "employerOrBusinessName",
  company: "employerOrBusinessName",
  companyname: "employerOrBusinessName",

  // Monthly Income
  monthlyincome: "monthlyIncomeRupees",
  monthlyincomerupees: "monthlyIncomeRupees",
  income: "monthlyIncomeRupees",
  salary: "monthlyIncomeRupees",

  // Address Line 1
  streetaddress: "addressLine1",
  addressline1: "addressLine1",
  address1: "addressLine1",
  street: "addressLine1",
  address: "addressLine1",
  line1: "addressLine1",
  houseaddress: "addressLine1",

  // Address Line 2
  addressline2: "addressLine2",
  address2: "addressLine2",
  line2: "addressLine2",
  landmark: "addressLine2",
  location: "addressLine2",

  // City
  city: "city",
  district: "city",
  town: "city",

  // State
  state: "state",
  province: "state",

  // Pincode
  pincode: "pincode",
  pin: "pincode",
  postalcode: "pincode",
  zip: "pincode",
  zipcode: "pincode",

  // Branch Code
  branch: "branchCode",
  branchcode: "branchCode",
  branchname: "branchCode",
  branchid: "branchCode",
};

/** Normalizes raw row keys using ALPHANUMERIC_HEADER_ALIASES mapping. */
function normalizeRow(rawObj: Record<string, unknown>): MemberCsvRow {
  const result: Partial<Record<MemberCsvRowKey, string>> = {};

  for (const [rawKey, val] of Object.entries(rawObj)) {
    if (!rawKey) continue;
    const cleanKey = rawKey.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetKey = ALPHANUMERIC_HEADER_ALIASES[cleanKey];

    if (targetKey) {
      let strVal = "";
      if (val instanceof Date) {
        strVal = val.toISOString().split("T")[0]!;
      } else if (val !== null && val !== undefined) {
        strVal = String(val).trim();
      }
      result[targetKey] = strVal;
    }
  }

  return {
    name: result.name ?? "",
    phone: result.phone ?? "",
    email: result.email ?? "",
    gender: result.gender ?? "",
    dateOfBirth: result.dateOfBirth ?? "",
    occupationType: result.occupationType ?? "",
    employerOrBusinessName: result.employerOrBusinessName ?? "",
    monthlyIncomeRupees: result.monthlyIncomeRupees ?? "",
    addressLine1: result.addressLine1 ?? "",
    addressLine2: result.addressLine2 ?? "",
    city: result.city ?? "",
    state: result.state ?? "",
    pincode: result.pincode ?? "",
    branchCode: result.branchCode ?? "",
  };
}

function extractCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0]!;
  if (typeof value === "object") {
    const valObj = value as Record<string, unknown>;
    if ("result" in valObj && valObj["result"] !== undefined) {
      return extractCellValue(valObj["result"]);
    }
    if ("text" in valObj && valObj["text"] !== undefined) {
      return extractCellValue(valObj["text"]);
    }
    if ("richText" in valObj && Array.isArray(valObj["richText"])) {
      return (valObj["richText"] as Array<{ text?: string }>).map((item) => item.text ?? "").join("");
    }
  }
  return String(value).trim();
}

/** Parses a CSV or Excel buffer into raw string rows with alias normalization. */
export async function parseMembersCsv(buffer: Buffer): Promise<MemberCsvRow[]> {
  if (!buffer || buffer.length === 0) {
    throw AppError.badRequest("Uploaded file is empty");
  }

  // Detect XLSX binary header (ZIP magic number 0x50 0x4B 0x03 0x04)
  const isXlsx = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;

  if (isXlsx) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.worksheets[0];

      if (worksheet && worksheet.rowCount > 0) {
        const headers: string[] = [];
        const rows: MemberCsvRow[] = [];

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) {
            row.eachCell((cell) => {
              headers.push(extractCellValue(cell.value).toLowerCase());
            });
          } else {
            const rowObj: Record<string, unknown> = {};
            row.eachCell((cell, colNumber) => {
              const header = headers[colNumber - 1];
              if (header) {
                rowObj[header] = extractCellValue(cell.value);
              }
            });
            if (Object.keys(rowObj).length > 0) {
              rows.push(normalizeRow(rowObj));
            }
          }
        });

        if (rows.length > 0) {
          return rows;
        }
      }
    } catch {
      // Fall through to plain text CSV parser below if Excel parsing fails or returns no rows
    }
  }

  // Parse plain CSV text (strip BOM if present)
  try {
    let textContent = buffer.toString("utf-8");
    if (textContent.charCodeAt(0) === 0xfeff) {
      textContent = textContent.slice(1);
    }

    const rawParsed = parse(textContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, unknown>[];

    if (!Array.isArray(rawParsed) || rawParsed.length === 0) {
      throw AppError.badRequest("No data rows found in uploaded file.");
    }

    return rawParsed.map((row) => normalizeRow(row));
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    throw AppError.badRequest("Failed to parse file. Please ensure it is a valid CSV or Excel spreadsheet.");
  }
}

export function parseFlexibleDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;
  const str = String(val).trim();
  if (!str) return undefined;

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(str);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1]!, 10);
    const month = parseInt(ddmmyyyyMatch[2]!, 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3]!, 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  // YYYY/MM/DD or YYYY-MM-DD
  const yyyymmddMatch = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/.exec(str);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1]!, 10);
    const month = parseInt(yyyymmddMatch[2]!, 10) - 1;
    const day = parseInt(yyyymmddMatch[3]!, 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

export function normalizeGender(val: unknown): Gender | undefined {
  if (!val) return undefined;
  const str = String(val).trim().toUpperCase();
  if (str === "MALE" || str === "M") return "MALE";
  if (str === "FEMALE" || str === "F") return "FEMALE";
  if (str === "OTHER" || str === "O") return "OTHER";
  return undefined;
}

export function normalizeOccupationType(val: unknown): OccupationType {
  if (!val) return "OTHER";
  const str = String(val).trim().toUpperCase();
  if (str.includes("SELF") || str.includes("FREELANCE")) return "SELF_EMPLOYED";
  if (str.includes("BUSINESS") || str.includes("OWNER") || str.includes("TRADER")) return "BUSINESS_OWNER";
  if (
    str.includes("PRIVATE") ||
    str.includes("EMPLOYEE") ||
    str.includes("TEACHER") ||
    str.includes("SALARY") ||
    str.includes("SALARIED") ||
    str.includes("JOB")
  ) {
    return "SALARIED";
  }
  if (str.includes("HOME") || str.includes("HOUSEWIFE")) return "HOMEMAKER";
  if (str.includes("STUDENT")) return "STUDENT";
  if (str.includes("RETIRED")) return "RETIRED";
  if (str.includes("UNEMPLOYED")) return "UNEMPLOYED";
  if ((OCCUPATION_TYPES as readonly string[]).includes(str)) return str as OccupationType;
  return "OTHER";
}

function toCsvField(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const EXPORT_HEADERS = [
  "memberCode",
  "name",
  "phone",
  "email",
  "status",
  "kycStatus",
  "riskBand",
  "riskValue",
  "occupationType",
  "city",
  "state",
  "pincode",
  "createdAt",
] as const;

export function serializeMembersToCsv(members: MemberDocument[]): string {
  const lines = [EXPORT_HEADERS.join(",")];

  for (const member of members) {
    const row = [
      member.memberCode,
      member.name,
      member.phone,
      member.email ?? "",
      member.status,
      member.kyc.status,
      member.riskScore?.band ?? "",
      member.riskScore?.value ?? "",
      member.occupation.type,
      member.address.city,
      member.address.state,
      member.address.pincode,
      member.createdAt.toISOString(),
    ];
    lines.push(row.map(toCsvField).join(","));
  }

  return lines.join("\n");
}

export function monthlyIncomeRupeesToPaise(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const rupees = Number(value);
  if (!Number.isFinite(rupees) || rupees < 0) return undefined;
  return Math.round(rupees * 100);
}
