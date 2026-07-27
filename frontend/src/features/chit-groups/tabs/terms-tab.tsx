import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import type { ChitGroup } from "../types";
import { useUpdateChitGroup } from "../use-chit-groups";

export function TermsTab({ chitGroup }: { chitGroup: ChitGroup }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("chit_group.update");
  const update = useUpdateChitGroup(chitGroup.id);

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(chitGroup.termsAndConditions ?? "");

  async function handleSave() {
    await update.mutateAsync({ termsAndConditions: text });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <Textarea rows={16} value={text} onChange={(e) => setText(e.target.value)} className="font-sans" />
        {update.isError ? (
          <p className="text-sm text-bad-fg">
            {update.error instanceof ApiError ? update.error.message : "Something went wrong"}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setEditing(false); setText(chitGroup.termsAndConditions ?? ""); }}>
            Cancel
          </Button>
          <Button disabled={update.isPending} onClick={() => void handleSave()}>
            {update.isPending ? "Saving…" : "Save terms"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canEdit ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            {chitGroup.termsAndConditions ? "Edit terms" : "Add terms"}
          </Button>
        ) : null}
      </div>
      {chitGroup.termsAndConditions ? (
        <div className="whitespace-pre-wrap rounded-md border border-border-default bg-bg-surface p-5 text-sm leading-relaxed text-text-primary">
          {chitGroup.termsAndConditions}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border-default py-12 text-center">
          <p className="text-sm text-text-secondary">No terms &amp; conditions recorded for this scheme.</p>
        </div>
      )}
    </div>
  );
}
