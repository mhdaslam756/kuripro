/** Mirrors the backend `template.util.ts` renderer/extractor so the builder can preview and hint. */

export function renderTemplate(template: string, context: Record<string, string | undefined>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = context[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function extractVariables(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}

export interface VariableInfo {
  name: string;
  label: string;
  /** Auto-filled by the server for member recipients — the sender never provides it. */
  auto: boolean;
}

/** Variables the server injects automatically for any member recipient. */
export const AUTO_VARIABLES = new Set(["orgName", "memberName", "memberCode", "phone"]);

export const VARIABLE_CATALOG: VariableInfo[] = [
  { name: "memberName", label: "Recipient's name", auto: true },
  { name: "memberCode", label: "Member code", auto: true },
  { name: "phone", label: "Member's phone", auto: true },
  { name: "orgName", label: "Your organization name", auto: true },
  { name: "amount", label: "Installment / received amount", auto: false },
  { name: "chitGroupName", label: "Chit group name", auto: false },
  { name: "dueDate", label: "Payment due date", auto: false },
  { name: "receiptNumber", label: "Receipt number", auto: false },
  { name: "cycleNumber", label: "Auction cycle number", auto: false },
  { name: "prizeAmount", label: "Prize amount", auto: false },
];

const CATALOG_BY_NAME = new Map(VARIABLE_CATALOG.map((v) => [v.name, v]));

export function variableLabel(name: string): string {
  return CATALOG_BY_NAME.get(name)?.label ?? name;
}

export function isAutoVariable(name: string): boolean {
  return AUTO_VARIABLES.has(name);
}

/** The variables in a body/subject that the sender must supply a value for (not auto-filled). */
export function manualVariables(...templates: (string | undefined)[]): string[] {
  const names = new Set<string>();
  for (const t of templates) {
    if (!t) continue;
    for (const v of extractVariables(t)) if (!isAutoVariable(v)) names.add(v);
  }
  return [...names];
}
