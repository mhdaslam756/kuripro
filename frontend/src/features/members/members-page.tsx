import { ChevronRight, Download, Phone, Plus, Search, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { BulkImportDialog } from "./components/bulk-import-dialog";
import { MemberFormDialog } from "./components/member-form-dialog";
import { KycStatusBadge, MemberStatusBadge, RiskBandBadge } from "./components/status-badges";
import { KYC_STATUSES, MEMBER_STATUSES, RISK_BANDS } from "./types";
import { buildMemberQueryString, useMembers, type MemberListFilters } from "./use-members";
import { humanize } from "@/lib/format";

const ALL = "__all__";

export function MembersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [kycStatus, setKycStatus] = useState<string>(ALL);
  const [riskBand, setRiskBand] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filters: MemberListFilters = {
    search: search || undefined,
    status: status === ALL ? undefined : status,
    kycStatus: kycStatus === ALL ? undefined : kycStatus,
    riskBand: riskBand === ALL ? undefined : riskBand,
    page,
    limit: 20,
  };

  const { data, isLoading, isError } = useMembers(filters);

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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Members</h1>
          <p className="text-sm text-text-secondary">Register, search, and manage the people in your chit funds.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canImportExport ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload size={15} /> Import
              </Button>
              <Button variant="outline" size="sm" disabled={exporting} onClick={() => void handleExport()}>
                <Download size={15} /> {exporting ? "Exporting…" : "Export"}
              </Button>
            </>
          ) : null}
          {canCreate ? (
            <Button size="sm" className="active-bounce" onClick={() => setFormOpen(true)}>
              <Plus size={16} /> Register member
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <Input
            className="pl-9 text-sm"
            placeholder="Search by name, phone, or code"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center">
          <FilterSelect label="Status" value={status} onValueChange={(v) => { setStatus(v); setPage(1); }} options={MEMBER_STATUSES} />
          <FilterSelect label="KYC" value={kycStatus} onValueChange={(v) => { setKycStatus(v); setPage(1); }} options={KYC_STATUSES} />
          <FilterSelect label="Risk" value={riskBand} onValueChange={(v) => { setRiskBand(v); setPage(1); }} options={RISK_BANDS} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-bad-fg">Couldn't load members. Please try again.</p>
      ) : data.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-default py-16 text-center">
          <p className="text-sm text-text-secondary">No members match your filters yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile View: Member Cards */}
          <div className="grid gap-3 md:hidden">
            {data.items.map((member) => (
              <div
                key={member.id}
                onClick={() => navigate(`/members/${member.id}`)}
                className="active-bounce flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-surface p-4 shadow-xs hover:border-brand-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 font-display text-base font-bold text-accent-primary">
                    {member.name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-text-primary text-base leading-tight">{member.name}</p>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-text-secondary">
                      <span>{member.memberCode}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Phone size={11} /> {member.phone}</span>
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

          {/* Desktop View: Data Table */}
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
                      className="cursor-pointer"
                      onClick={() => navigate(`/members/${member.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{member.memberCode}</TableCell>
                      <TableCell className="font-medium">{member.name}</TableCell>
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

          <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
            <span>
              {data.total} member{data.total === 1 ? "" : "s"} · page {data.page} of {data.totalPages}
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
