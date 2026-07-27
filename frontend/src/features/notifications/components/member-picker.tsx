import { useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useMembers } from "@/features/members/use-members";
import type { Member } from "@/features/members/types";

/** Searchable single-member selector used by the single-send form. */
export function MemberPicker({ value, onChange }: { value: Member | undefined; onChange: (m: Member | undefined) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = useMembers({ search: search || undefined, status: "ACTIVE", limit: 8 });

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border-default px-3 py-2">
        <span className="text-sm text-text-primary">
          {value.name} <span className="ml-1.5 font-mono text-xs text-text-secondary">{value.memberCode}</span>
        </span>
        <button type="button" onClick={() => onChange(undefined)} className="text-text-secondary hover:text-text-primary" aria-label="Clear">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden />
        <Input
          className="pl-8"
          placeholder="Search members by name or code…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && search ? (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border-default bg-surface shadow-md">
          {(data?.items ?? []).length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-secondary">No matching members</div>
          ) : (
            (data?.items ?? []).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-muted"
              >
                <span className="text-text-primary">{m.name}</span>
                <span className="font-mono text-xs text-text-secondary">{m.memberCode}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
