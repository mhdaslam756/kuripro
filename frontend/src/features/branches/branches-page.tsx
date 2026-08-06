import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BranchFormDialog } from "./branch-form-dialog";
import type { Branch } from "./types";
import { useBranches } from "./use-branches";

export function BranchesPage() {
  const { data, isLoading, isError } = useBranches();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | undefined>(undefined);

  function openCreateDialog() {
    setEditingBranch(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(branch: Branch) {
    setEditingBranch(branch);
    setDialogOpen(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Branches</h1>
          <p className="text-sm text-text-secondary">Regional offices for your organization.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus size={16} />
          Add branch
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-bad-fg">Couldn't load branches. Please try again.</p>
      ) : data.items.length === 0 ? (
        <p className="text-sm text-text-secondary">No branches yet — add your first one.</p>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="grid gap-3 md:hidden">
            {data.items.map((branch) => (
              <div
                key={branch.id}
                onClick={() => openEditDialog(branch)}
                className="active-bounce flex items-center justify-between rounded-2xl border border-border-default bg-bg-surface p-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary text-base">{branch.name}</span>
                    <span className="font-mono text-xs font-bold text-accent-primary bg-brand-50 px-2 py-0.5 rounded-md">
                      {branch.code}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">City: {branch.address.city}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={branch.status === "ACTIVE" ? "success" : "neutral"}>{branch.status}</Badge>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(branch);
                    }}
                    className="p-1.5 text-text-secondary hover:text-accent-primary"
                    aria-label={`Edit ${branch.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>City</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell className="font-mono text-xs">{branch.code}</TableCell>
                      <TableCell>{branch.address.city}</TableCell>
                      <TableCell>
                        <Badge variant={branch.status === "ACTIVE" ? "success" : "neutral"}>{branch.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => openEditDialog(branch)}
                          className="text-text-secondary hover:text-accent-primary"
                          aria-label={`Edit ${branch.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </>
      )}

      <BranchFormDialog open={dialogOpen} onOpenChange={setDialogOpen} branch={editingBranch} />
    </div>
  );
}
