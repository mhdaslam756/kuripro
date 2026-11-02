import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReplacementSettingsForm } from "@/features/organization/replacement-settings-tab";
import { ApiError } from "@/lib/api-client";
import type { ChitGroup } from "../types";
import {
  useGroupReplacementSettings,
  useUpdateGroupReplacementSettings,
} from "../use-chit-groups";

/**
 * Replacement terms for one chit group. By default a group follows the organisation's settings;
 * switching to "own terms" lets this group differ without touching any other group.
 */
export function ReplacementTermsTab({ chitGroup }: { chitGroup: ChitGroup }) {
  const { data, isLoading, isError } = useGroupReplacementSettings(
    chitGroup.id,
  );
  const update = useUpdateGroupReplacementSettings(chitGroup.id);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDefault, setConfirmDefault] = useState(false);

  if (isLoading) return <Skeleton className="h-48 w-full max-w-2xl" />;
  if (isError || !data)
    return (
      <p role="alert" className="text-sm text-bad-fg">
        Couldn&apos;t load this group&apos;s replacement settings.
      </p>
    );

  const isActive = chitGroup.status === "ACTIVE";
  const ownTerms = data.source === "GROUP";
  const showForm = ownTerms || editing;

  async function switchToDefault() {
    setError(null);
    try {
      await update.mutateAsync({
        useOrganizationDefault: true,
        confirmActiveChange: isActive,
      });
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not switch back to the organisation default.",
      );
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-default bg-bg-surface p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            Member replacement terms
            <Badge variant={ownTerms ? "brand" : "neutral"}>
              {ownTerms ? "This group's own terms" : "Organisation default"}
            </Badge>
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {ownTerms
              ? "Replacements in this group use the terms below. Other groups are not affected."
              : "This group follows Organization → Member Replacement. Set its own terms to make it different."}
          </p>
        </div>
        {ownTerms ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              isActive ? setConfirmDefault(true) : void switchToDefault()
            }
            disabled={update.isPending}
          >
            Use organisation default
          </Button>
        ) : !editing ? (
          <Button size="sm" onClick={() => setEditing(true)}>
            Set terms for this group
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>

      {isActive ? (
        <p className="rounded-md border border-warn-border bg-warn-bg px-3 py-2 text-sm text-warn-strong">
          This chit group is running. Changing its replacement terms needs your
          confirmation, and only affects replacements made from now on.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-bad-fg">
          {error}
        </p>
      ) : null}

      <AlertDialog open={confirmDefault} onOpenChange={setConfirmDefault}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch to the organisation default?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This group is running. It will stop using its own replacement
              terms and follow the organisation default instead. Replacements
              already made are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDefault(false);
                void switchToDefault();
              }}
            >
              Yes, switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showForm ? (
        <ReplacementSettingsForm
          // Re-seed the form when the source changes so it always starts from the right values.
          key={data.source + (editing ? "-edit" : "")}
          initial={data.settings}
          isPending={update.isPending}
          confirmBeforeSave={
            isActive
              ? {
                  title: "Change the terms of a running chit group?",
                  description:
                    "This group is active. The new terms apply to replacements made from now on. Replacements already made are not changed.",
                }
              : undefined
          }
          saveLabel="Save for this group"
          successMessage="Saved for this group. Replacements here use these terms from now on."
          onSave={(input) =>
            update
              .mutateAsync({
                useOrganizationDefault: false,
                confirmActiveChange: isActive,
                memberReplacement: input,
              })
              .then(() => setEditing(false))
          }
        />
      ) : null}
    </div>
  );
}
