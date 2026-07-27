import { FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useUpload } from "@/lib/use-upload";
import { formatDateTime } from "@/lib/format";
import type { ChitGroup } from "../types";
import { useAddChitDocument, useRemoveChitDocument } from "../use-chit-groups";

export function DocumentsTab({ chitGroup }: { chitGroup: ChitGroup }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("chit_group.update");
  const fileRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");

  const upload = useUpload();
  const addDoc = useAddChitDocument(chitGroup.id);
  const removeDoc = useRemoveChitDocument(chitGroup.id);

  async function handleFile(file: File) {
    const uploaded = await upload.mutateAsync(file);
    await addDoc.mutateAsync({ label: label || file.name, url: uploaded.url, publicId: uploaded.publicId });
    setLabel("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const busy = upload.isPending || addDoc.isPending;

  return (
    <div className="flex flex-col gap-4">
      {chitGroup.documents.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-12 text-center">
          <p className="text-sm text-text-secondary">No documents attached to this scheme.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border-default rounded-md border border-border-default">
          {chitGroup.documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-text-secondary" />
                <div>
                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm text-accent-link hover:underline">
                    {doc.label}
                  </a>
                  <p className="text-xs text-text-secondary">{formatDateTime(doc.uploadedAt)}</p>
                </div>
              </div>
              {canManage ? (
                <button
                  type="button"
                  aria-label="Remove document"
                  className="text-text-secondary hover:text-bad-fg"
                  onClick={() => void removeDoc.mutateAsync(doc.id)}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-wrap items-end gap-3 border-t border-border-default pt-4">
          <div className="flex-1">
            <label htmlFor="doc-label" className="mb-1.5 block text-sm font-medium text-text-primary">
              Document label
            </label>
            <Input
              id="doc-label"
              placeholder="e.g. Registered agreement, By-laws"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
      ) : null}

      {upload.isError || addDoc.isError ? (
        <p className="text-sm text-bad-fg">Upload failed. File uploads require Cloudinary to be configured.</p>
      ) : null}
    </div>
  );
}
