import { useQuery } from "@tanstack/react-query";
import { Building2, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api-client";
import { useAuth, type OrganizationOption } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface OrganizationListProps {
  organizations: OrganizationOption[];
  currentTenantId?: string | null;
  pendingTenantId?: string | null;
  onSelect: (organization: OrganizationOption) => void;
}

/** One tappable row per organisation: logo or initial, name, and the person's role there. */
function OrganizationList({ organizations, currentTenantId, pendingTenantId, onSelect }: OrganizationListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {organizations.map((org) => {
        const isCurrent = org.tenantId === currentTenantId;
        const isPending = org.tenantId === pendingTenantId;
        return (
          <li key={org.tenantId}>
            <button
              type="button"
              disabled={Boolean(pendingTenantId) || isCurrent}
              onClick={() => onSelect(org)}
              className={cn(
                "active-bounce flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                isCurrent
                  ? "border-accent-primary/40 bg-accent-primary/10"
                  : "border-border-default bg-bg-surface hover:bg-bg-raised disabled:opacity-60",
              )}
            >
              {org.logoUrl ? (
                <img src={org.logoUrl} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-700 to-accent-primary font-display text-base font-bold text-white"
                >
                  {org.name.trim().charAt(0).toUpperCase() || <Building2 size={18} />}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-bold text-text-primary">{org.name}</span>
                <span className="block truncate text-xs text-text-secondary">
                  {org.roleName}
                  {org.isHome ? " · your first organization" : ""}
                </span>
              </span>
              {isPending ? (
                <Loader2 size={18} className="animate-spin text-accent-primary" />
              ) : isCurrent ? (
                <Badge variant="info" className="gap-1">
                  <Check size={12} /> Current
                </Badge>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface OrganizationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: OrganizationOption[];
  currentTenantId?: string | null;
  title?: string;
  description?: string;
  /** Resolves when the choice has been applied; a rejection is shown as the dialog's error. */
  onSelect: (organization: OrganizationOption) => Promise<void>;
}

/** "Which organization do you want to open?" — used after signing in and for switching. */
export function OrganizationPickerDialog({
  open,
  onOpenChange,
  organizations,
  currentTenantId,
  title = "Choose an organization",
  description = "Your account belongs to more than one organization. Which one do you want to open?",
  onSelect,
}: OrganizationPickerDialogProps) {
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(organization: OrganizationOption) {
    setError(null);
    setPendingTenantId(organization.tenantId);
    try {
      await onSelect(organization);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open that organization. Please try again.");
    } finally {
      setPendingTenantId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (pendingTenantId ? undefined : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader className="pr-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <OrganizationList
          organizations={organizations}
          currentTenantId={currentTenantId}
          pendingTenantId={pendingTenantId}
          onSelect={(org) => void handleSelect(org)}
        />
        {error ? (
          <p role="alert" className="mt-3 text-sm text-bad-fg">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** The menu's "Switch organization": lists the person's organisations and moves them without a password. */
export function SwitchOrganizationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, switchOrganization } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth", "organizations", user?.id, user?.tenantId],
    queryFn: () => api.get<{ organizations: OrganizationOption[]; currentTenantId: string | null }>("/auth/organizations"),
    enabled: open && Boolean(user),
  });

  const organizations = data?.organizations ?? [];

  if (open && !isLoading && !isError && organizations.length <= 1) {
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader className="pr-10">
            <DialogTitle>Switch organization</DialogTitle>
            <DialogDescription>
              {organizations[0] ? `You're only in ${organizations[0].name} right now. ` : ""}
              To join another organization, open its sign-up page and enter your mobile number — you'll just confirm
              with your password, with no long form.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <OrganizationPickerDialog
      open={open}
      onOpenChange={onOpenChange}
      organizations={organizations}
      currentTenantId={data?.currentTenantId ?? user?.tenantId}
      title="Switch organization"
      description={
        isLoading ? "Loading your organizations…" : isError ? "Couldn't load your organizations." : "Pick the organization you want to open."
      }
      onSelect={async (org) => {
        await switchOrganization(org.tenantId);
        onOpenChange(false);
        navigate("/dashboard", { replace: true });
      }}
    />
  );
}
