import { ChevronRight, Download, Phone, Plus, Search, Upload, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { MobileFilterSheet } from "@/components/mobile/mobile-filter-sheet";
import { MobileEmptyState, MobileErrorState } from "@/components/mobile/mobile-states";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatDate, humanize } from "@/lib/format";
import { BulkImportDialog } from "./components/bulk-import-dialog";
import { MemberFormDialog } from "./components/member-form-dialog";
import { KycStatusBadge, MemberStatusBadge, RiskBandBadge } from "./components/status-badges";
import { KYC_STATUSES, MEMBER_STATUSES, RISK_BANDS } from "./types";
import { buildMemberQueryString, useMembers, type MemberListFilters } from "./use-members";

const ALL = "__all__";

export function MembersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [kycStatus, setKycStatus] = useState<string>(ALL);
  const [riskBand, setRiskBand] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const activeFilterCount = (status !== ALL ? 1 : 0) + (kycStatus !== ALL ? 1 : 0) + (riskBand !== ALL ? 1 : 0);

  const filters: MemberListFilters = {
    search: search || undefined,
    status: status === ALL ? undefined : status,
    kycStatus: kycStatus === ALL ? undefined : kycStatus,
    riskBand: riskBand === ALL ? undefined : riskBand,
    page,
    limit: 20,
  };

  const { data, isLoading, isError, refetch } = useMembers(filters);

  const canImportExport = hasPermission("members.import_export");
  const canCreate = hasPermission("members.create");

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await api.download(`/members/export?${buildMemberQueryString({ ...filters, page: 1, limit: 20 })}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function handleResetFilters() {
    setStatus(ALL);
    setKycStatus(ALL);
    setRiskBand(ALL);
    setSearch("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Members Directory</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-text-secondary">Register, search, and manage member profiles in your organization.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canImportExport ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="rounded-xl">
                <Upload size={15} /> Import
              </Button>
              <Button variant="outline" size="sm" disabled={exporting} onClick={() => void handleExport()} className="rounded-xl">
                <Download size={15} /> {exporting ? "Exporting…" : "Export"}
              </Button>
            </>
          ) : null}
          {canCreate ? (
            <Button size="sm" className="rounded-xl font-semibold gap-1.5 active-bounce" onClick={() => setFormOpen(true)}>
              <Plus size={16} /> Register Member
            </Button>
          ) : null}
        </div>
      </div>

      {/* Search & Filter Control Bar */}
      <div className="mb-2 flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <Input
            className="pl-10 text-sm h-11 rounded-2xl border-border-default/80 bg-bg-surface"
            placeholder="Search by name, phone, code…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

          {/* Desktop inline dropdown filters */}
          <div className="hidden md:flex md:items-center md:gap-2">
            <FilterSelect label="Status" value={status} onValueChange={(v) => { setStatus(v); setPage(1); }} options={MEMBER_STATUSES} />
            <FilterSelect label="KYC" value={kycStatus} onValueChange={(v) => { setKycStatus(v); setPage(1); }} options={KYC_STATUSES} />
            <FilterSelect label="Risk" value={riskBand} onValueChange={(v) => { setRiskBand(v); setPage(1); }} options={RISK_BANDS} />
          </div>

          {/* Mobile Bottom Filter Sheet Trigger */}
          <div className="md:hidden">
            <MobileFilterSheet
              open={filterSheetOpen}
              onOpenChange={setFilterSheetOpen}
              activeCount={activeFilterCount}
              onReset={handleResetFilters}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">Membership Status</label>
                  <FilterSelect label="Status" value={status} onValueChange={(v) => { setStatus(v); setPage(1); }} options={MEMBER_STATUSES} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">KYC Verification</label>
                  <FilterSelect label="KYC" value={kycStatus} onValueChange={(v) => { setKycStatus(v); setPage(1); }} options={KYC_STATUSES} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">Risk Rating</label>
                  <FilterSelect label="Risk" value={riskBand} onValueChange={(v) => { setRiskBand(v); setPage(1); }} options={RISK_BANDS} />
                </div>
              </div>
            </MobileFilterSheet>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : isError || !data ? (
          <MobileErrorState onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <MobileEmptyState
            icon={<Users size={32} />}
            title="No members found"
            description="No member records match your current filters or search term."
            action={
              canCreate ? (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus size={15} /> Add First Member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Mobile Native List Cards View (< md) */}
            <div className="grid gap-3 md:hidden">
              {data.items.map((member) => (
                <div
                  key={member.id}
                  onClick={() => navigate(`/members/${member.id}`)}
                  className="active:scale-[0.98] flex items-center justify-between gap-3 rounded-2xl border border-border-default/80 bg-bg-surface p-4 shadow-xs transition-all active:bg-bg-raised"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar className="size-11 shrink-0 border border-brand-200/60 shadow-xs">
                      <AvatarFallback>{member.name.trim().charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text-primary text-base leading-tight">{member.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-text-secondary">
                        <span className="font-semibold">{member.memberCode}</span>
                        <span>·</span>
                        <a
                          href={`tel:${member.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-accent-primary font-sans hover:underline"
                        >
                          <Phone size={11} /> {member.phone}
                        </a>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <MemberStatusBadge status={member.status} />
                        <KycStatusBadge status={member.kyc.status} />
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-text-secondary" />
                </div>
              ))}
            </div>

            {/* Desktop View: Data Table (>= md) */}
            <div className="hidden md:block">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Code</TableHeaderCell>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Phone</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>KYC</TableHeaderCell>
                      <TableHeaderCell>Risk</TableHeaderCell>
                      <TableHeaderCell>Joined</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map((member) => (
                      <TableRow
                        key={member.id}
                        className="cursor-pointer hover:bg-brand-50/50"
                        onClick={() => navigate(`/members/${member.id}`)}
                      >
                        <TableCell className="font-mono text-xs font-semibold text-accent-primary">{member.memberCode}</TableCell>
                        <TableCell className="font-semibold text-text-primary">{member.name}</TableCell>
                        <TableCell className="text-text-secondary">{member.phone}</TableCell>
                        <TableCell><MemberStatusBadge status={member.status} /></TableCell>
                        <TableCell><KycStatusBadge status={member.kyc.status} /></TableCell>
                        <TableCell>
                          {member.riskScore ? (
                            <RiskBandBadge band={member.riskScore.band} value={member.riskScore.value} />
                          ) : (
                            <span className="text-xs text-text-disabled">Not scored</span>
                          )}
                        </TableCell>
                        <TableCell className="text-text-secondary">{formatDate(member.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between text-xs text-text-secondary px-1">
              <span>
                Showing <strong>{data.items.length}</strong> of <strong>{data.total}</strong> members
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

      <MemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(memberId) => navigate(`/members/${memberId}`)}
      />
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {humanize(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
