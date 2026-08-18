import { useState, useEffect } from "react";
import { Check, LogIn, Plus, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from "@/lib/saved-accounts";

interface AccountSwitcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSwitcherDialog({ open, onOpenChange }: AccountSwitcherDialogProps) {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SavedAccount | null>(null);
  const [password, setPassword] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newIdentifier, setNewIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSavedAccounts(getSavedAccounts());
      setError(null);
      setPassword("");
      setIsAddingNew(false);
      setNewIdentifier("");
      setNewPassword("");
      setSelectedAccount(null);
    }
  }, [open, user]);

  async function handleSwitchToAccount(account: SavedAccount) {
    if (account.id === user?.id) {
      onOpenChange(false);
      return;
    }
    setSelectedAccount(account);
    setPassword("");
    setError(null);
  }

  async function handleConfirmSwitch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount || !password) {
      setError("Please enter the password for this account.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loggedUser = await login(selectedAccount.email, password, true);
      toast.success(`Switched to ${loggedUser.name} (${loggedUser.role?.name || "Account"})`);
      onOpenChange(false);
      if (loggedUser.role?.slug === "SUPER_ADMIN") {
        navigate("/super-admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to switch account. Please verify password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNewAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newIdentifier || !newPassword) {
      setError("Please enter both email/phone and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loggedUser = await login(newIdentifier, newPassword, true);
      toast.success(`Logged in as ${loggedUser.name}`);
      onOpenChange(false);
      if (loggedUser.role?.slug === "SUPER_ADMIN") {
        navigate("/super-admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  function handleRemoveAccount(e: React.MouseEvent, accountId: string) {
    e.stopPropagation();
    removeSavedAccount(accountId);
    setSavedAccounts(getSavedAccounts());
    if (selectedAccount?.id === accountId) {
      setSelectedAccount(null);
    }
  }

  function getRoleBadgeVariant(slug?: string) {
    switch (slug) {
      case "SUPER_ADMIN":
        return "brand" as const;
      case "ORGANIZER":
        return "info" as const;
      case "STAFF":
        return "warning" as const;
      case "MEMBER":
        return "success" as const;
      default:
        return "neutral" as const;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] sm:max-h-[85vh] flex flex-col sm:max-w-md w-full max-w-full overflow-hidden p-4 sm:p-6 rounded-t-[28px] sm:rounded-3xl shadow-2xl border-border-default/90 box-border">
        <DialogHeader className="text-left pb-2.5 border-b border-border-default/60 shrink-0 max-w-full overflow-hidden">
          <div className="flex items-center gap-2 text-accent-primary font-display text-lg sm:text-xl font-bold">
            <Users size={20} className="shrink-0" />
            <DialogTitle>Switch Account</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-text-secondary truncate block max-w-full">
            Switch between accounts saved on this device.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="mt-2 rounded-2xl border border-bad-border/60 bg-bad-bg/15 p-2.5 text-xs text-bad-fg font-medium shrink-0 max-w-full">
            {error}
          </div>
        ) : null}

        {/* View 1: Switching to an existing saved account password prompt */}
        {selectedAccount ? (
          <form onSubmit={(e) => void handleConfirmSwitch(e)} className="flex flex-col gap-3.5 mt-2 overflow-y-auto overflow-x-hidden min-h-0 w-full max-w-full box-border">
            <div className="flex items-center gap-3 rounded-2xl border border-border-default bg-bg-raised p-3 overflow-hidden w-full max-w-full box-border">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 font-bold text-white shadow-xs text-sm">
                {selectedAccount.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <p className="font-semibold text-xs sm:text-sm text-text-primary truncate block max-w-full">{selectedAccount.name}</p>
                  <Badge variant={getRoleBadgeVariant(selectedAccount.role?.slug)} className="text-[9px] px-1.5 py-0 shrink-0">
                    {selectedAccount.role?.name || "User"}
                  </Badge>
                </div>
                <p className="text-[11px] text-text-secondary truncate block max-w-full mt-0.5">{selectedAccount.email}</p>
              </div>
            </div>

            <Field label={`Enter password for ${selectedAccount.name}`} htmlFor="switch-password">
              <Input
                id="switch-password"
                type="password"
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </Field>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-default/60 shrink-0 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedAccount(null);
                  setError(null);
                }}
                disabled={loading}
                className="rounded-xl h-9 text-xs"
              >
                Back to list
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !password}
                className="rounded-xl h-9 text-xs gap-1.5 active-bounce"
              >
                {loading ? "Switching…" : "Confirm & Switch"}
                <LogIn size={14} />
              </Button>
            </div>
          </form>
        ) : isAddingNew ? (
          /* View 2: Add another account login form */
          <form onSubmit={(e) => void handleAddNewAccount(e)} className="flex flex-col gap-3 mt-2 overflow-y-auto overflow-x-hidden min-h-0 w-full max-w-full box-border">
            <p className="text-xs font-semibold text-text-primary">Sign in to add another account to this device:</p>
            <Field label="Phone or Email" htmlFor="new-identifier">
              <Input
                id="new-identifier"
                placeholder="e.g. 9876543210 or email@domain.com"
                value={newIdentifier}
                onChange={(e) => setNewIdentifier(e.target.value)}
                autoFocus
                required
              />
            </Field>

            <Field label="Password" htmlFor="new-password">
              <Input
                id="new-password"
                type="password"
                placeholder="Enter password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Field>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-default/60 shrink-0 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddingNew(false);
                  setError(null);
                }}
                disabled={loading}
                className="rounded-xl h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !newIdentifier || !newPassword}
                className="rounded-xl h-9 text-xs gap-1.5 active-bounce"
              >
                {loading ? "Signing in…" : "Sign In & Add"}
                <LogIn size={14} />
              </Button>
            </div>
          </form>
        ) : (
          /* View 3: List of all saved accounts */
          <div className="flex flex-col gap-2.5 mt-2 min-h-0 flex-1 w-full max-w-full overflow-x-hidden box-border">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary shrink-0">
              Accounts on this device ({savedAccounts.length || 1})
            </p>

            <div className="flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0 flex-1 w-full max-w-full pr-0.5 box-border">
              {/* Ensure current active account is always at top */}
              {user ? (
                <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-brand-400 bg-brand-50/80 p-3 shadow-xs transition-all shrink-0 w-full max-w-full box-border overflow-hidden">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                    <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 font-bold text-white shadow-xs text-xs">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="font-bold text-xs sm:text-sm text-text-primary truncate block max-w-full">{user.name}</span>
                        <Badge variant={getRoleBadgeVariant(user.role?.slug)} className="text-[9px] px-1.5 py-0 shrink-0">
                          {user.role?.name || "Active"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-text-secondary truncate block max-w-full mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="success" className="shrink-0 text-[10px] font-bold px-2 py-0.5 gap-1">
                    <Check size={11} strokeWidth={3} /> Active
                  </Badge>
                </div>
              ) : null}

              {/* Other saved accounts */}
              {savedAccounts
                .filter((acc) => acc.id !== user?.id && acc.email.toLowerCase() !== user?.email?.toLowerCase())
                .map((account) => (
                  <div
                    key={account.id || account.email}
                    onClick={() => void handleSwitchToAccount(account)}
                    className="group active-bounce flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-border-default bg-bg-surface hover:bg-bg-raised p-3 shadow-xs transition-all hover:border-brand-300 shrink-0 w-full max-w-full box-border overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-raised group-hover:bg-brand-100 font-bold text-text-secondary group-hover:text-accent-primary transition-colors text-xs">
                        {account.name?.charAt(0).toUpperCase() || "A"}
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="font-semibold text-xs sm:text-sm text-text-primary truncate block max-w-full">{account.name}</span>
                          <Badge variant={getRoleBadgeVariant(account.role?.slug)} className="text-[9px] px-1.5 py-0 shrink-0">
                            {account.role?.name || "Account"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-text-secondary truncate block max-w-full mt-0.5">{account.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 sm:h-8 px-2.5 rounded-xl text-xs font-semibold group-hover:border-brand-400 group-hover:text-accent-primary shrink-0"
                      >
                        Switch
                      </Button>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAccount(e, account.id)}
                        className="p-1.5 text-text-secondary hover:text-bad-fg transition-colors shrink-0"
                        title="Remove from saved accounts"
                        aria-label="Remove account"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddingNew(true);
                setError(null);
              }}
              className="w-full max-w-full box-border h-9 sm:h-10 rounded-2xl border-dashed border-border-default hover:border-brand-400 font-semibold text-xs text-text-primary gap-1.5 shrink-0"
            >
              <Plus size={15} /> Add / Log in to another account
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
