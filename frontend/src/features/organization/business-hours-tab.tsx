import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api-client";
import type { BusinessHoursEntry, Organization, Weekday } from "./types";
import { useUpdateBusinessHours } from "./use-organization";

const DAY_LABELS: Record<Weekday, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

export function BusinessHoursTab({ organization }: { organization: Organization }) {
  const updateBusinessHours = useUpdateBusinessHours();
  const [hours, setHours] = useState<BusinessHoursEntry[]>(organization.businessHours);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateDay(day: Weekday, patch: Partial<BusinessHoursEntry>) {
    setSuccessMessage(null);
    setHours((prev) => prev.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)));
  }

  async function handleSave() {
    setSuccessMessage(null);
    try {
      const normalized = hours.map((entry) =>
        entry.isOpen ? entry : { day: entry.day, isOpen: false },
      );
      await updateBusinessHours.mutateAsync(normalized);
      setSuccessMessage("Business hours saved");
    } catch {
      // surfaced below via updateBusinessHours.error
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col divide-y divide-border-default rounded-md border border-border-default">
        {hours.map((entry) => (
          <div key={entry.day} className="flex items-center gap-4 px-4 py-3">
            <span className="w-28 text-sm font-medium text-text-primary">{DAY_LABELS[entry.day]}</span>
            <Switch
              checked={entry.isOpen}
              onCheckedChange={(checked: boolean) =>
                updateDay(entry.day, checked ? { isOpen: true, opensAt: "09:00", closesAt: "18:00" } : { isOpen: false })
              }
            />
            {entry.isOpen ? (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Input
                  type="time"
                  className="h-9 w-28"
                  value={entry.opensAt ?? "09:00"}
                  onChange={(e) => updateDay(entry.day, { opensAt: e.target.value })}
                />
                <span>to</span>
                <Input
                  type="time"
                  className="h-9 w-28"
                  value={entry.closesAt ?? "18:00"}
                  onChange={(e) => updateDay(entry.day, { closesAt: e.target.value })}
                />
              </div>
            ) : (
              <span className="text-sm text-text-disabled">Closed</span>
            )}
          </div>
        ))}
      </div>

      {updateBusinessHours.isError ? (
        <p className="text-sm text-bad-fg">
          {updateBusinessHours.error instanceof ApiError ? updateBusinessHours.error.message : "Something went wrong"}
        </p>
      ) : null}
      {successMessage ? <p className="text-sm text-good-fg">{successMessage}</p> : null}

      <div>
        <Button onClick={() => void handleSave()} disabled={updateBusinessHours.isPending}>
          {updateBusinessHours.isPending ? "Saving…" : "Save business hours"}
        </Button>
      </div>
    </div>
  );
}
