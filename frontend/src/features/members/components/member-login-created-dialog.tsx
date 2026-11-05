import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MemberLogin } from "../use-members";

interface MemberLoginCreatedDialogProps {
  open: boolean;
  memberName: string;
  login: MemberLogin | null;
  /** Called when the staff member has noted the details and closes the box. */
  onDone: () => void;
}

/** Shown once after "Register member": how the new member signs in, and the password to hand them. */
export function MemberLoginCreatedDialog({ open, memberName, login, onDone }: MemberLoginCreatedDialogProps) {
  const [copied, setCopied] = useState(false);

  async function copyDetails() {
    if (!login?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(`Mobile number: ${login.loginId}\nTemporary password: ${login.temporaryPassword}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (insecure origin or blocked); the details are on screen to copy by hand
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => !next && onDone()}>
      <DialogContent>
        <DialogHeader className="pr-10">
          <DialogTitle>{memberName} was added</DialogTitle>
          <DialogDescription>
            {login?.status === "CREATED"
              ? "A login was created. Give them these details — they will be asked to choose their own password the first time they sign in."
              : login?.status === "LINKED"
                ? "They already had a login here, so it was linked. They sign in with the password they already have."
                : "This number already has a KuriPro account in another organization, so no new login was made. They can join your organization from your sign-up link using the password of their existing account."}
          </DialogDescription>
        </DialogHeader>

        {login?.status === "CREATED" && login.temporaryPassword ? (
          <div className="rounded-2xl border border-good-border bg-good-bg/30 p-4">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Sign in with</dt>
                <dd className="font-mono text-base font-semibold text-text-primary">{login.loginId}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Temporary password</dt>
                <dd className="font-mono text-base font-semibold text-text-primary">{login.temporaryPassword}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-text-secondary">This password is shown only now. It can't be looked up later.</p>
          </div>
        ) : null}

        <DialogFooter>
          {login?.status === "CREATED" ? (
            <Button type="button" variant="outline" onClick={() => void copyDetails()} className="gap-1.5">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy details"}
            </Button>
          ) : null}
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
