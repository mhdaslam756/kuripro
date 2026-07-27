/**
 * Replaces `{{variable}}` placeholders in a template body/subject with values from `context`.
 * Unknown placeholders are left blank (never leaked as raw `{{...}}` to a recipient). Whitespace
 * inside the braces is tolerated: `{{ memberName }}` works the same as `{{memberName}}`.
 */
export function renderTemplate(template: string, context: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = context[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/** Extracts the distinct variable names referenced by a template — powers the Template Builder hints. */
export function extractVariables(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}
