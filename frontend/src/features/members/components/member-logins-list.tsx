import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MemberLoginRow } from "../use-members";

const STATUS_TEXT: Record<MemberLoginRow["status"], string> = {
  CREATED: "Login created",
  LINKED: "Linked to existing login",
  EXISTING_ACCOUNT: "Already has an account elsewhere",
};

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Downloads the sign-in details as a CSV so staff can hand them out. The passwords can't be retrieved later. */
export function downloadLoginsCsv(rows: MemberLoginRow[], fileName = "member-logins.csv") {
  const lines = [
    ["Member code", "Name", "Sign in with (mobile)", "Temporary password", "Note"].map(csvCell).join(","),
    ...rows.map((row) =>
      [row.memberCode, row.name, row.loginId, row.temporaryPassword ?? "", STATUS_TEXT[row.status]].map(csvCell).join(","),
    ),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** The logins just created, with a download button. Shown after the import and after "create logins". */
export function MemberLoginsList({ rows }: { rows: MemberLoginRow[] }) {
  const created = rows.filter((row) => row.status === "CREATED");
  const others = rows.length - created.length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-primary">
        <span className="font-semibold text-good-fg">{created.length} login{created.length === 1 ? "" : "s"} created</span>
        {others > 0 ? <span className="text-text-secondary"> · {others} not created (already have an account)</span> : null}
      </p>

      {created.length > 0 ? (
        <>
          <p className="text-xs text-text-secondary">
            Members sign in with their mobile number and the temporary password, and choose their own password the first time. These
            passwords are shown only now, so download the list before closing.
          </p>
          <ul className="max-h-56 divide-y divide-border-default overflow-y-auto rounded-xl border border-border-default text-sm">
            {created.map((row) => (
              <li key={row.memberId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-text-primary">{row.name}</span>{" "}
                  <span className="font-mono text-xs text-text-secondary">{row.loginId}</span>
                </span>
                <span className="shrink-0 font-mono text-xs font-semibold text-text-primary">{row.temporaryPassword}</span>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" className="gap-1.5 self-start" onClick={() => downloadLoginsCsv(rows)}>
            <Download size={15} /> Download list (CSV)
          </Button>
        </>
      ) : null}
    </div>
  );
}
