import { useState, type FormEvent } from "react";
import { ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

interface Props {
  open: boolean;
  onPasswordChanged: () => void;
}

export function FirstLoginModal({ open, onPasswordChanged }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      onPasswordChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-brand-100 text-accent-primary">
            <Sparkles size={20} />
          </div>
          <DialogTitle className="text-center font-display text-xl font-bold text-text-primary">
            Set Your New Password
          </DialogTitle>
          <p className="text-center text-xs text-text-secondary">
            You logged in with a temporary password. Please set a permanent password to continue.
          </p>
        </DialogHeader>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-bad-border bg-bad-bg p-3 text-xs font-medium text-bad-fg">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 mt-2">
          <Field label="Temporary Password" htmlFor="temp-password">
            <Input
              id="temp-password"
              type="password"
              required
              placeholder="Enter temporary password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>

          <Field label="New Password" htmlFor="new-password">
            <Input
              id="new-password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>

          <Field label="Confirm New Password" htmlFor="confirm-password">
            <Input
              id="confirm-password"
              type="password"
              required
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>

          <Button type="submit" disabled={loading} className="active-bounce mt-2 font-semibold">
            {loading ? "Updating Password…" : "Save New Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
