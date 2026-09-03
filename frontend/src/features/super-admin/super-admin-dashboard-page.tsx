import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Key,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Slash,
  Users,
  XCircle,
  ArrowLeftRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { AccountSwitcherDialog } from "@/components/layout/account-switcher-dialog";
import {
  useApproveOrganization,
  usePlatformStats,
  useRejectOrganization,
  useSetOrganizationStatus,
  useSuperAdminOrganizations,
} from "./use-super-admin";

export function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Change password modal state (auto opens if mustChangePassword is true)
  const [changePassOpen, setChangePassOpen] = useState(Boolean(user?.mustChangePassword));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: orgsData, isLoading: orgsLoading } = useSuperAdminOrganizations(statusFilter, search, page);

  const approveOrg = useApproveOrganization();
  const rejectOrg = useRejectOrganization();
  const setStatus = useSetOrganizationStatus();

  async function handleLogout() {
    await logout();
    navigate("/super-admin/login", { replace: true });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassError("");

    if (newPassword.length < 8) {
      setPassError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("New password and confirm password do not match.");
      return;
    }

    setPassLoading(true);
    try {
      await api.post("/super-admin/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success("Super Admin password updated successfully!");
      updateUser({ mustChangePassword: false });
      setChangePassOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPassError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setPassLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-bg-app">
      {/* Super Admin Top Header */}
      <header className="sticky top-0 z-20 border-b border-border-default bg-bg-surface/90 px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent-primary font-display text-lg font-bold text-text-on-brand shadow-sm">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-accent-primary">KuriPro</span>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-primary">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] font-medium text-text-secondary">Platform Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-text-primary">{user?.name || "Super Admin"}</p>
              <p className="text-xs text-text-secondary">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSwitcherOpen(true)}
              className="active-bounce gap-1.5 border-brand-300 text-accent-primary hover:bg-brand-50"
            >
              <ArrowLeftRight size={15} /> Switch Account
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangePassOpen(true)}
              className="active-bounce gap-1.5 border-brand-300 text-accent-primary hover:bg-brand-50"
            >
              <Key size={15} /> Change Password
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleLogout()} className="active-bounce gap-1.5">
              <LogOut size={15} /> Log out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        {user?.mustChangePassword ? (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-warn-border bg-warn-bg px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2 text-warn-fg">
              <ShieldAlert size={18} className="shrink-0" />
              <span className="text-xs font-semibold sm:text-sm">
                Security Notice: Please update your password to continue.
              </span>
            </div>
            <Button size="sm" className="bg-warn-fg text-white text-xs" onClick={() => setChangePassOpen(true)}>
              Change Password Now
            </Button>
          </div>
        ) : null}

        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">Platform Overview</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage organization requests, account statuses, and system statistics.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile icon={<Building2 className="size-4" />} label="Total Orgs" value={statsLoading ? "…" : String(stats?.totalOrganizations ?? 0)} />
          <StatTile icon={<Clock className="size-4 text-warn-fg" />} label="Pending" value={statsLoading ? "…" : String(stats?.pendingOrganizations ?? 0)} tone="text-warn-fg" />
          <StatTile icon={<CheckCircle2 className="size-4 text-good-fg" />} label="Active" value={statsLoading ? "…" : String(stats?.activeOrganizations ?? 0)} tone="text-good-fg" />
          <StatTile icon={<Slash className="size-4 text-bad-fg" />} label="Suspended" value={statsLoading ? "…" : String(stats?.suspendedOrganizations ?? 0)} tone="text-bad-fg" />
          <StatTile icon={<Users className="size-4" />} label="Members" value={statsLoading ? "…" : String(stats?.totalMembers ?? 0)} />
          <StatTile icon={<ShieldCheck className="size-4" />} label="Kuris (Chits)" value={statsLoading ? "…" : String(stats?.totalKuris ?? 0)} />
        </div>

        {/* Organizations Section */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-text-primary">Registered Organizations</h2>
              <p className="text-xs text-text-secondary">Review pending requests and manage active organizations.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {["__all__", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => { setStatusFilter(st); setPage(1); }}
                  className={`active-bounce rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? "bg-accent-primary text-text-on-brand shadow-xs"
                      : "bg-bg-raised text-text-secondary hover:bg-brand-50 hover:text-text-primary"
                  }`}
                >
                  {st === "__all__" ? "All" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <Input
              className="pl-9 text-sm"
              placeholder="Search by organization name, slug, phone, or email"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {orgsLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !orgsData || orgsData.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-default py-12 text-center">
              <p className="text-sm text-text-secondary">No organizations match the selected criteria.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {orgsData.items.map((org) => (
                <div
                  key={org.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs transition-all hover:border-brand-300 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-semibold text-text-primary text-base">{org.name}</h3>
                      <span className="font-mono text-xs font-bold bg-brand-50 px-2 py-0.5 rounded text-accent-primary">
                        {org.slug}.platform.com
                      </span>
                      <StatusBadge status={org.status} />
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      Contact: {org.contactEmail} · {org.contactPhone} · Reg #{org.registrationNumber} · Registered {formatDate(org.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {org.status === "PENDING_APPROVAL" ? (
                      <>
                        <Button
                          size="sm"
                          disabled={approveOrg.isPending}
                          onClick={() => void approveOrg.mutateAsync(org.id)}
                          className="active-bounce gap-1 bg-good-fg hover:bg-good-fg/90 text-white"
                        >
                          <CheckCircle2 size={15} /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={rejectOrg.isPending}
                          onClick={() => void rejectOrg.mutateAsync({ id: org.id })}
                          className="active-bounce gap-1"
                        >
                          <XCircle size={15} /> Reject
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant={org.status === "ACTIVE" ? "outline" : "primary"}
                        disabled={setStatus.isPending}
                        onClick={() =>
                          void setStatus.mutateAsync({
                            id: org.id,
                            status: org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                          })
                        }
                        className="active-bounce gap-1"
                      >
                        <RefreshCw size={14} />
                        {org.status === "ACTIVE" ? "Suspend Org" : "Activate Org"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Change Password Drawer Modal */}
      <Sheet open={changePassOpen} onOpenChange={setChangePassOpen}>
        <SheetContent side="bottom" className="sm:max-w-md sm:mx-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-2 text-accent-primary">
              <Key size={20} />
              <SheetTitle>Change Password</SheetTitle>
            </div>
            <SheetDescription>
              Update your administrator password. Password must be at least 8 characters.
            </SheetDescription>
          </SheetHeader>

          {passError ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-bad-border bg-bad-bg p-3 text-xs font-medium text-bad-fg">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{passError}</span>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleChangePassword(e)} className="flex flex-col gap-4">
            <Field label="Current Password *" htmlFor="current-pass">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary z-10" size={16} />
                <Input
                  id="current-pass"
                  type="password"
                  required
                  placeholder="Enter current password"
                  className="pl-9"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            </Field>

            <Field label="New Password *" htmlFor="new-pass">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary z-10" size={16} />
                <Input
                  id="new-pass"
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  className="pl-9"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Confirm New Password *" htmlFor="confirm-pass">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary z-10" size={16} />
                <Input
                  id="confirm-pass"
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  className="pl-9"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </Field>

            <div className="mt-2 flex items-center justify-end gap-3">
              {!user?.mustChangePassword ? (
                <Button type="button" variant="outline" onClick={() => setChangePassOpen(false)}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" disabled={passLoading} className="active-bounce">
                {passLoading ? "Updating Password…" : "Update Password"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AccountSwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </div>
  );
}

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs">
      <div className="mb-2 flex items-center gap-2 text-text-secondary">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-accent-primary">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-display text-2xl font-bold tabular-nums ${tone ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING_APPROVAL: "bg-warn-bg text-warn-fg border-warn-border",
    ACTIVE: "bg-good-bg text-good-fg border-good-border",
    SUSPENDED: "bg-bad-bg text-bad-fg border-bad-border",
    REJECTED: "bg-bad-bg text-bad-fg border-bad-border",
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${styles[status] ?? "bg-bg-raised text-text-secondary"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
