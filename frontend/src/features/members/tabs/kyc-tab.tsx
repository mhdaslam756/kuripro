import { FileText, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatDateTime, humanize } from "@/lib/format";
import { KycStatusBadge } from "../components/status-badges";
import { DOCUMENT_CATEGORIES, type Member } from "../types";
import {
  useAddDocument,
  useRejectKyc,
  useRemoveDocument,
  useSubmitKyc,
  useUploadFile,
  useVerifyKyc,
} from "../use-members";

export function KycTab({ member }: { member: Member }) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("members.update");
  const canVerify = hasPermission("members.verify_kyc");

  const submitKyc = useSubmitKyc(member.id);
  const verifyKyc = useVerifyKyc(member.id);
  const rejectKyc = useRejectKyc(member.id);

  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState(member.kyc.panNumber ?? "");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function handleSubmitIdentity() {
    await submitKyc.mutateAsync({
      aadhaarNumber: aadhaar || undefined,
      panNumber: pan || undefined,
    });
    setAadhaar("");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>KYC status</CardTitle>
          <KycStatusBadge status={member.kyc.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-secondary">Aadhaar</dt>
              <dd className="mt-0.5 text-sm text-text-primary">
                {member.kyc.aadhaarLast4 ? `XXXX XXXX ${member.kyc.aadhaarLast4}` : "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-secondary">PAN</dt>
              <dd className="mt-0.5 text-sm text-text-primary">{member.kyc.panNumber ?? "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-secondary">Submitted</dt>
              <dd className="mt-0.5 text-sm text-text-primary">{formatDate(member.kyc.submittedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-secondary">Verified</dt>
              <dd className="mt-0.5 text-sm text-text-primary">{formatDate(member.kyc.verifiedAt)}</dd>
            </div>
          </dl>

          {member.kyc.status === "REJECTED" && member.kyc.rejectionReason ? (
            <p className="rounded-md border border-bad-border bg-bad-bg px-3 py-2 text-sm text-bad-fg">
              Rejected: {member.kyc.rejectionReason}
            </p>
          ) : null}

          {canVerify && member.kyc.status === "PENDING" ? (
            <div className="flex gap-2">
              <Button disabled={verifyKyc.isPending} onClick={() => void verifyKyc.mutateAsync()}>
                <ShieldCheck size={16} /> {verifyKyc.isPending ? "Verifying…" : "Verify KYC"}
              </Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                Reject
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {canUpdate ? (
        <Card>
          <CardHeader>
            <CardTitle>Submit identity details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Aadhaar number"
                htmlFor="aadhaar"
                helpText="Only the last 4 digits and a one-way hash are stored — never the full number."
              >
                <Input
                  id="aadhaar"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="12 digits"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <Field label="PAN number" htmlFor="pan">
                <Input
                  id="pan"
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                />
              </Field>
            </div>
            {submitKyc.isError ? (
              <p className="text-sm text-bad-fg">
                {submitKyc.error instanceof ApiError ? submitKyc.error.message : "Something went wrong"}
              </p>
            ) : null}
            <div>
              <Button
                disabled={submitKyc.isPending || (!aadhaar && !pan)}
                onClick={() => void handleSubmitIdentity()}
              >
                {submitKyc.isPending ? "Saving…" : "Submit for verification"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <DocumentsCard member={member} canUpdate={canUpdate} />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC</DialogTitle>
          </DialogHeader>
          <Field label="Reason" htmlFor="reject-reason">
            <Input id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectReason.length < 3 || rejectKyc.isPending}
              onClick={async () => {
                await rejectKyc.mutateAsync(rejectReason);
                setRejectOpen(false);
                setRejectReason("");
              }}
            >
              {rejectKyc.isPending ? "Rejecting…" : "Reject KYC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentsCard({ member, canUpdate }: { member: Member; canUpdate: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();
  const addDocument = useAddDocument(member.id);
  const removeDocument = useRemoveDocument(member.id);

  const [category, setCategory] = useState<string>("KYC");
  const [docType, setDocType] = useState("AADHAAR_FRONT");

  async function handleFile(file: File) {
    const uploaded = await uploadFile.mutateAsync(file);
    await addDocument.mutateAsync({ category, type: docType, url: uploaded.url, publicId: uploaded.publicId });
    if (fileRef.current) fileRef.current.value = "";
  }

  const busy = uploadFile.isPending || addDocument.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {member.documents.length === 0 ? (
          <p className="text-sm text-text-secondary">No documents uploaded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-default">
            {member.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-text-secondary" />
                  <div>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm text-accent-link hover:underline">
                      {doc.type}
                    </a>
                    <p className="text-xs text-text-secondary">
                      {humanize(doc.category)} · {formatDateTime(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                {canUpdate ? (
                  <button
                    type="button"
                    aria-label="Remove document"
                    className="text-text-secondary hover:text-bad-fg"
                    onClick={() => void removeDocument.mutateAsync(doc.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canUpdate ? (
          <div className="flex flex-wrap items-end gap-3 border-t border-border-default pt-4">
            <Field label="Category" htmlFor="doc-category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="doc-category" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {humanize(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Label" htmlFor="doc-type">
              <Input id="doc-type" className="w-48" value={docType} onChange={(e) => setDocType(e.target.value)} />
            </Field>
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
            <Button variant="outline" disabled={busy || !docType} onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> {busy ? "Uploading…" : "Upload file"}
            </Button>
          </div>
        ) : null}

        {uploadFile.isError || addDocument.isError ? (
          <p className="text-sm text-bad-fg">Upload failed. File uploads require Cloudinary to be configured.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
