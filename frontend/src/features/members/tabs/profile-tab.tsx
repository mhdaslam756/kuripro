import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatPaise, humanize } from "@/lib/format";
import { MemberFormDialog } from "../components/member-form-dialog";
import type { Member } from "../types";
import { useDeactivateMember, useInviteToPortal } from "../use-members";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-sm text-text-primary">{value || "—"}</dd>
    </div>
  );
}

export function ProfileTab({ member }: { member: Member }) {
  const { hasPermission } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState(member.email ?? "");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  /** Set when the email already had an account here and the member was attached to it instead. */
  const [linkedAccount, setLinkedAccount] = useState<string | null>(null);

  const deactivate = useDeactivateMember();
  const invite = useInviteToPortal(member.id);

  const canUpdate = hasPermission("members.update");
  const canDelete = hasPermission("members.delete");

  const inviteDone = tempPassword !== null || linkedAccount !== null;

  function resetInvite() {
    setTempPassword(null);
    setLinkedAccount(null);
  }

  async function handleInvite() {
    const result = await invite.mutateAsync(email);
    if (result.linkedExistingAccount) setLinkedAccount(email);
    else setTempPassword(result.temporaryPassword);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        {canUpdate && !member.userId ? (
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            Invite to portal
          </Button>
        ) : null}
        {canUpdate ? <Button variant="outline" onClick={() => setEditOpen(true)}>Edit profile</Button> : null}
        {canDelete && member.status === "ACTIVE" ? (
          <Button variant="destructive" disabled={deactivate.isPending} onClick={() => void deactivate.mutateAsync(member.id)}>
            {deactivate.isPending ? "Deactivating…" : "Deactivate"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="Member code" value={member.memberCode} />
              <Detail label="Phone" value={member.phone} />
              <Detail label="Email" value={member.email ?? ""} />
              <Detail label="Gender" value={member.gender ? humanize(member.gender) : ""} />
              <Detail label="Date of birth" value={member.dateOfBirth ? formatDate(member.dateOfBirth) : ""} />
              <Detail label="Portal access" value={member.userId ? "Enabled" : "Not invited"} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Occupation</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="Type" value={humanize(member.occupation.type)} />
              <Detail label="Employer / business" value={member.occupation.employerOrBusinessName ?? ""} />
              <Detail label="Monthly income" value={formatPaise(member.occupation.monthlyIncome)} />
              <Detail label="Work address" value={member.occupation.workAddress ?? ""} />
            </dl>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-primary">
              {[member.address.line1, member.address.line2, member.address.city, member.address.state, member.address.pincode]
                .filter(Boolean)
                .join(", ")}
            </p>
            {member.address.lat !== undefined && member.address.lng !== undefined ? (
              <p className="mt-1 text-xs text-text-secondary">
                Geotagged · {member.address.lat.toFixed(5)}, {member.address.lng.toFixed(5)}
              </p>
            ) : null}
            {member.notes ? <p className="mt-3 text-sm text-text-secondary">Notes: {member.notes}</p> : null}
          </CardContent>
        </Card>
      </div>

      <MemberFormDialog open={editOpen} onOpenChange={setEditOpen} member={member} />

      <Dialog open={inviteOpen} onOpenChange={(next: boolean) => { setInviteOpen(next); if (!next) resetInvite(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite {member.name} to the portal</DialogTitle>
            <DialogDescription>
              Creates a member login. Share the temporary password with them; they'll set their own on first sign-in.
              If the email already signs in here, the member is attached to that account instead.
            </DialogDescription>
          </DialogHeader>
          {tempPassword ? (
            <div className="rounded-md border border-good-border bg-good-bg p-4">
              <p className="text-sm text-good-fg">Portal access created. Temporary password:</p>
              <p className="mt-1 font-mono text-lg text-text-primary">{tempPassword}</p>
            </div>
          ) : linkedAccount ? (
            <div className="rounded-md border border-good-border bg-good-bg p-4">
              <p className="text-sm text-good-fg">
                Linked to the existing {linkedAccount} account — they sign in with the password they already have.
              </p>
            </div>
          ) : (
            <Field label="Login email" htmlFor="invite-email">
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          )}
          <DialogFooter>
            {inviteDone ? (
              <Button type="button" onClick={() => { setInviteOpen(false); resetInvite(); }}>
                Done
              </Button>
            ) : (
              <Button type="button" disabled={!email || invite.isPending} onClick={() => void handleInvite()}>
                {invite.isPending ? "Inviting…" : "Create portal access"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
