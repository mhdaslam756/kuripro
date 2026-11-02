import type { ReactNode } from "react";
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
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import type {
  CommissionCalculationBase,
  CommissionOwnershipMode,
  DisplacementCommissionMode,
  InstallmentSettlementMode,
  RemainingCommissionPolicy,
  MemberReplacementSettings,
  Organization,
  ReplacementFeeMode,
} from "./types";
import {
  useUpdateReplacementSettings,
  type MemberReplacementSettingsInput,
} from "./use-organization";

const DEFAULTS: MemberReplacementSettings = {
  installmentSettlementMode: "PENDING",
  commissionOwnershipMode: "ORGANIZATION",
  fixedCommissionAmount: 0,
  replacementFeeMode: "NONE",
  replacementFeeAmount: 0,
  replacementFeePercentage: 0,
  commissionCalculationBase: "TOTAL_COMMISSION",
};

const BASE_LABELS: Record<CommissionCalculationBase, string> = {
  TOTAL_COMMISSION: "Ticket commission",
  REMAINING_INSTALMENTS: "Replacement member's remaining instalments",
  PREVIOUS_MEMBER_PAID: "Total paid by the previous member",
};

function OptionCard({
  group,
  value,
  title,
  description,
  children,
}: {
  /** Keeps radio ids unique across the page's several option groups. */
  group: string;
  value: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <label
      htmlFor={`opt-${group}-${value}`}
      className="flex cursor-pointer items-start gap-3 rounded-md border border-border-default bg-bg-surface p-4 has-[[data-state=checked]]:border-accent-primary has-[[data-state=checked]]:bg-accent-primary/10"
    >
      <RadioGroupItem
        id={`opt-${group}-${value}`}
        value={value}
        className="mt-0.5 shrink-0"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        <span className="text-xs text-text-secondary">{description}</span>
        {children}
      </span>
    </label>
  );
}

function Section({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-text-primary">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent-primary/15 text-xs font-bold text-accent-primary">
            {step}
          </span>
          {title}
          <span className="text-xs font-medium text-text-secondary">
            Choose one
          </span>
        </h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** Organisation → Member Replacement: the default every chit group follows unless it sets its own. */
export function ReplacementSettingsTab({
  organization,
}: {
  organization: Organization;
}) {
  const update = useUpdateReplacementSettings();
  return (
    <ReplacementSettingsForm
      initial={organization.settings.memberReplacement}
      onSave={(input) => update.mutateAsync(input).then(() => undefined)}
      isPending={update.isPending}
      confirmBeforeSave={{
        title: "Change the default replacement terms?",
        description:
          "Every chit group that doesn't have its own terms, including groups that are already running, will use these terms for replacements made from now on. Replacements already made are not changed.",
      }}
      saveLabel="Save default settings"
      successMessage="Default replacement settings saved. Chit groups without their own terms use these from now on."
    />
  );
}

/** The replacement terms form, shared by the organisation default and per-group overrides. */
export function ReplacementSettingsForm({
  initial,
  onSave,
  isPending,
  saveLabel = "Save settings",
  successMessage,
  confirmBeforeSave,
}: {
  /** When set, saving first asks the user to confirm (used for groups that are already running). */
  confirmBeforeSave?: { title: string; description: string };
  initial?: MemberReplacementSettings;
  onSave: (input: MemberReplacementSettingsInput) => Promise<void>;
  isPending: boolean;
  saveLabel?: string;
  successMessage: string;
}) {
  const saved = { ...DEFAULTS, ...(initial ?? {}) };

  const [settlement, setSettlement] = useState<InstallmentSettlementMode>(
    saved.installmentSettlementMode,
  );
  const [ownership, setOwnership] = useState<CommissionOwnershipMode>(
    saved.commissionOwnershipMode,
  );
  const [fixedCommission, setFixedCommission] = useState(
    String(saved.fixedCommissionAmount / 100 || ""),
  );
  const [feeMode, setFeeMode] = useState<ReplacementFeeMode>(
    saved.replacementFeeMode,
  );
  const [feeAmount, setFeeAmount] = useState(
    String(saved.replacementFeeAmount / 100 || ""),
  );
  const [feePercent, setFeePercent] = useState(
    String(saved.replacementFeePercentage || ""),
  );
  const [feeBase, setFeeBase] = useState<CommissionCalculationBase>(
    saved.commissionCalculationBase,
  );
  const dc = initial?.displacementCommission;
  const [dcEnabled, setDcEnabled] = useState(
    dc?.commissionAllocationEnabled ?? false,
  );
  const [dcMode, setDcMode] = useState<DisplacementCommissionMode>(
    dc?.displacementCommissionMode ?? "CUSTOM_PERCENTAGE",
  );
  const [prevPct, setPrevPct] = useState(
    String(dc?.previousMemberPercentage ?? 50),
  );
  const [replPct, setReplPct] = useState(
    String(dc?.replacementMemberPercentage ?? 50),
  );
  const [prevFixed, setPrevFixed] = useState(
    String((dc?.previousMemberFixedAmount ?? 0) / 100 || ""),
  );
  const [replFixed, setReplFixed] = useState(
    String((dc?.replacementMemberFixedAmount ?? 0) / 100 || ""),
  );
  const [remaining, setRemaining] = useState<RemainingCommissionPolicy>(
    dc?.remainingCommissionPolicy ?? "ORGANIZATION",
  );
  // Hundredths of a percent, so 33.33 + 66.67 compares exactly against 100.
  const pctTotal =
    Math.round((Number(prevPct) || 0) * 100) +
    Math.round((Number(replPct) || 0) * 100);
  const pctInvalid =
    dcEnabled && dcMode === "CUSTOM_PERCENTAGE" && pctTotal !== 10000;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (pctInvalid) {
      setError(
        "The previous and replacement percentages must add up to exactly 100%.",
      );
      return;
    }
    if (confirmBeforeSave) {
      setConfirmOpen(true);
      return;
    }
    await doSave();
  }

  async function doSave() {
    setConfirmOpen(false);
    try {
      await onSave({
        installmentSettlementMode: settlement,
        commissionOwnershipMode: ownership,
        fixedCommissionAmountRupees: Number(fixedCommission) || 0,
        replacementFeeMode: feeMode,
        replacementFeeAmountRupees: Number(feeAmount) || 0,
        replacementFeePercentage: Number(feePercent) || 0,
        commissionCalculationBase: feeBase,
        displacementCommission: {
          commissionAllocationEnabled: dcEnabled,
          displacementCommissionMode: dcMode,
          previousMemberPercentage: Number(prevPct) || 0,
          replacementMemberPercentage: Number(replPct) || 0,
          previousMemberFixedAmountRupees: Number(prevFixed) || 0,
          replacementMemberFixedAmountRupees: Number(replFixed) || 0,
          remainingCommissionPolicy: remaining,
        },
      });
      setMessage(successMessage);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save the settings. Please try again.",
      );
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSave(e)}
      className="flex max-w-2xl flex-col gap-8"
    >
      <Section
        step={1}
        title="Replacement payment"
        description="An extra amount the new member pays when taking over a ticket. It is recorded separately from instalments."
      >
        <RadioGroup
          value={feeMode}
          onValueChange={(v: string) => setFeeMode(v as ReplacementFeeMode)}
          aria-label="Replacement fee"
        >
          <OptionCard
            group="fee"
            value="NONE"
            title="No additional payment"
            description="The new member takes over the position without a replacement charge."
          />
          <OptionCard
            group="fee"
            value="FIXED"
            title="Fixed replacement fee"
            description="A flat amount the new member pays at replacement."
          >
            {feeMode === "FIXED" ? (
              <div className="mt-2 max-w-48">
                <Field label="Fee (₹)" htmlFor="feeAmount">
                  <Input
                    id="feeAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
          </OptionCard>
          <OptionCard
            group="fee"
            value="PERCENTAGE"
            title="Percentage-based fee"
            description="A percentage of the base you choose. The calculated amount is shown before you confirm."
          >
            {feeMode === "PERCENTAGE" ? (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field label="Percentage (%)" htmlFor="feePercent">
                  <Input
                    id="feePercent"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={feePercent}
                    onChange={(e) => setFeePercent(e.target.value)}
                  />
                </Field>
                <Field label="Calculated on" htmlFor="feeBase">
                  <Select
                    value={feeBase}
                    onValueChange={(v: string) =>
                      setFeeBase(v as CommissionCalculationBase)
                    }
                  >
                    <SelectTrigger id="feeBase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(BASE_LABELS) as CommissionCalculationBase[]
                      ).map((b) => (
                        <SelectItem key={b} value={b}>
                          {BASE_LABELS[b]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            ) : null}
          </OptionCard>
        </RadioGroup>
      </Section>

      <Section
        step={2}
        title="Previous member's instalments"
        description="What happens to the instalments the outgoing member has already paid."
      >
        <RadioGroup
          value={settlement}
          onValueChange={(v: string) =>
            setSettlement(v as InstallmentSettlementMode)
          }
          aria-label="Instalment settlement"
        >
          <OptionCard
            group="settle"
            value="PENDING"
            title="Keep pending (default)"
            description="Record the amount against the outgoing member and settle it later, from the membership history."
          />
          <OptionCard
            group="settle"
            value="IMMEDIATE"
            title="Settle immediately"
            description="Settle the amount when the replacement is confirmed and write it to the financial ledger."
          />
        </RadioGroup>
      </Section>

      <Section
        step={3}
        title="Commission paid to the chit company"
        description="Members pay a commission to the chit company. When a member is replaced, choose who pays it. The previous member's share is taken off what the company pays back to them."
      >
        <RadioGroup
          value={dcEnabled ? "CUSTOM" : ownership}
          onValueChange={(v: string) => {
            setDcEnabled(v === "CUSTOM");
            if (v !== "CUSTOM") setOwnership(v as CommissionOwnershipMode);
          }}
          aria-label="Commission ownership"
        >
          <OptionCard
            group="ownership"
            value="ORGANIZATION"
            title="No commission on replacement (default)"
            description="Neither member is charged commission because of the replacement."
          />
          <OptionCard
            group="ownership"
            value="PREVIOUS_MEMBER"
            title="Previous member pays the full commission"
            description="The member who is leaving pays all of it. The replacement member pays nothing."
          />
          <OptionCard
            group="ownership"
            value="REPLACEMENT_MEMBER"
            title="Replacement member pays the full commission"
            description="The new member pays all of it. The previous member pays nothing."
          />
          <OptionCard
            group="ownership"
            value="EQUAL_SPLIT"
            title="Equal sharing"
            description="The previous and replacement members each pay half. For example, ₹1,000 commission means ₹500 each."
          />
          <OptionCard
            group="ownership"
            value="BY_CYCLES"
            title="Shared by cycles held"
            description="Each pays in proportion to the cycles they held the ticket. For example, stopping after 3 of 6 cycles on ₹1,000 means ₹500 each."
          />

          {/* Kept only for organisations that already saved this; the same result is available under Custom split. */}
          {ownership === "FIXED_AMOUNT" ? (
            <OptionCard
              group="ownership"
              value="FIXED_AMOUNT"
              title="Previous member pays a fixed amount"
              description="The previous member pays this amount and the replacement member pays the rest. It can't be more than the ticket's commission."
            >
              {ownership === "FIXED_AMOUNT" ? (
                <div className="mt-2 max-w-48">
                  <Field label="Amount (₹)" htmlFor="fixedCommission">
                    <Input
                      id="fixedCommission"
                      type="number"
                      min={0}
                      step="0.01"
                      value={fixedCommission}
                      onChange={(e) => setFixedCommission(e.target.value)}
                    />
                  </Field>
                </div>
              ) : null}
            </OptionCard>
          ) : null}
          <OptionCard
            group="ownership"
            value="CUSTOM"
            title="Custom split"
            description="For anything the options above don't cover. Pick one method below: percentages you set, money paid, or fixed amounts."
          />
        </RadioGroup>
        {dcEnabled ? (
          <div className="flex flex-col gap-3 rounded-md border border-border-default bg-bg-raised/40 p-4">
            <p className="text-sm font-semibold text-text-primary">
              Custom commission split
            </p>
            <>
              <RadioGroup
                value={dcMode}
                onValueChange={(v: string) =>
                  setDcMode(v as DisplacementCommissionMode)
                }
                aria-label="Commission allocation method"
              >
                {/* Same as "Shared by cycles held" above; shown only if this was saved earlier. */}
                {dcMode === "CYCLE_BASED" ? (
                  <OptionCard
                    group="dc"
                    value="CYCLE_BASED"
                    title="Cycle-based"
                    description="Divided by how many cycles each member held the ticket. For example 6 of 20 cycles and 14 of 20 gives 30% and 70%."
                  />
                ) : null}
                {/* The replacement has paid nothing at replacement time, so this always charges the
                    previous member in full; shown only if it was saved earlier. */}
                {dcMode === "CONTRIBUTION_BASED" ? (
                  <OptionCard
                    group="dc"
                    value="CONTRIBUTION_BASED"
                    title="By money paid (not recommended)"
                    description="The new member has paid nothing yet, so the previous member is charged the whole commission. Choose Percentages you set or Shared by cycles held instead."
                  />
                ) : null}
                <OptionCard
                  group="dc"
                  value="CUSTOM_PERCENTAGE"
                  title="Percentages you set"
                  description="You set the two percentages. They must total exactly 100%."
                >
                  {dcMode === "CUSTOM_PERCENTAGE" ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Previous member (%)" htmlFor="prevPct">
                          <Input
                            id="prevPct"
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={prevPct}
                            onChange={(e) => setPrevPct(e.target.value)}
                          />
                        </Field>
                        <Field label="Replacement member (%)" htmlFor="replPct">
                          <Input
                            id="replPct"
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={replPct}
                            onChange={(e) => setReplPct(e.target.value)}
                          />
                        </Field>
                      </div>
                      <div
                        aria-hidden
                        className="flex h-2 overflow-hidden rounded-full bg-bg-raised"
                      >
                        <div
                          className="bg-accent-primary"
                          style={{
                            width: `${Math.min(100, Number(prevPct) || 0)}%`,
                          }}
                        />
                        <div
                          className="bg-good-strong"
                          style={{
                            width: `${Math.max(0, Math.min(100 - (Number(prevPct) || 0), Number(replPct) || 0))}%`,
                          }}
                        />
                      </div>
                      <p
                        role="status"
                        className={
                          pctInvalid
                            ? "text-xs font-medium text-bad-fg"
                            : "text-xs text-text-secondary"
                        }
                      >
                        Previous {Number(prevPct) || 0}% · Replacement{" "}
                        {Number(replPct) || 0}% · Total {pctTotal / 100}%
                        {pctInvalid ? " — must be exactly 100%" : ""}
                      </p>
                    </div>
                  ) : null}
                </OptionCard>
                <OptionCard
                  group="dc"
                  value="FIXED_AMOUNT"
                  title="Fixed amounts you set"
                  description="You set an amount for each member. Together they can't exceed the commission available; any left over follows the policy below."
                >
                  {dcMode === "FIXED_AMOUNT" ? (
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <Field label="Previous member (₹)" htmlFor="prevFixed">
                        <Input
                          id="prevFixed"
                          type="number"
                          min={0}
                          step="0.01"
                          value={prevFixed}
                          onChange={(e) => setPrevFixed(e.target.value)}
                        />
                      </Field>
                      <Field label="Replacement member (₹)" htmlFor="replFixed">
                        <Input
                          id="replFixed"
                          type="number"
                          min={0}
                          step="0.01"
                          value={replFixed}
                          onChange={(e) => setReplFixed(e.target.value)}
                        />
                      </Field>
                    </div>
                  ) : null}
                </OptionCard>
              </RadioGroup>
              {dcMode === "FIXED_AMOUNT" || dcMode === "CONTRIBUTION_BASED" ? (
                <div className="max-w-sm">
                  <Field
                    label="Commission not covered by the split is paid by"
                    htmlFor="dcRemaining"
                  >
                    <Select
                      value={remaining}
                      onValueChange={(v: string) =>
                        setRemaining(v as RemainingCommissionPolicy)
                      }
                    >
                      <SelectTrigger id="dcRemaining">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORGANIZATION">
                          No one (not charged)
                        </SelectItem>
                        <SelectItem value="PREVIOUS_MEMBER">
                          The previous member
                        </SelectItem>
                        <SelectItem value="REPLACEMENT_MEMBER">
                          The replacement member
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              ) : null}
            </>
          </div>
        ) : null}
      </Section>

      <section
        aria-label="When a replaced ticket wins a prize"
        className="rounded-md border border-border-default bg-bg-raised/40 p-4"
      >
        <h3 className="font-display text-base font-semibold text-text-primary">
          When a replaced ticket wins a prize
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          This is fixed so the company never pays more than the prize. The
          previous member's refund is always taken out of the prize, and the new
          member receives the rest. A refund already paid counts as part of that
          share and is never paid again. For example, a ₹29,000 prize with a
          ₹14,500 refund pays the new member ₹14,500.
        </p>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-bad-fg">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-good-strong">
          {message}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : saveLabel}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmBeforeSave?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBeforeSave?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doSave()}>
              Yes, change it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
