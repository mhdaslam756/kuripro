import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import type { FinanceEntryType } from "../types";
import { useCreateFinanceEntry } from "../use-reports";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: FinanceEntryType;
}

const INCOME_CATEGORIES = ["Bank Interest", "Registration Fees", "Penalty / Late Fee", "Other Income"];
const EXPENSE_CATEGORIES = ["Salaries", "Rent", "Office Expenses", "Printing & Stationery", "Travel", "Bank Charges", "Other Expense"];

export function FinanceEntryDialog({ open, onOpenChange, type }: Props) {
  const create = useCreateFinanceEntry();
  const categories = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const [category, setCategory] = useState(categories[0]!);
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("CASH");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  function reset() {
    setCategory(categories[0]!);
    setAmount("");
    setChannel("CASH");
    setDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    create.reset();
  }

  async function handleSave() {
    await create.mutateAsync({
      type,
      category,
      amountRupees: Number(amount),
      channel,
      date,
      description: description || undefined,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record {type === "INCOME" ? "income" : "expense"}</DialogTitle>
          <DialogDescription>
            {type === "INCOME"
              ? "Money received that isn't a chit installment — interest, fees, etc."
              : "Operational spending — salaries, rent, office costs, etc."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" htmlFor="fe-category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="fe-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Amount (₹)" htmlFor="fe-amount">
              <Input id="fe-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Channel" htmlFor="fe-channel">
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="fe-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK">Bank</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date" htmlFor="fe-date">
              <Input id="fe-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Description (optional)" htmlFor="fe-desc">
            <Input id="fe-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          {create.isError ? (
            <p className="text-sm text-bad-fg">
              {create.error instanceof ApiError ? create.error.message : "Something went wrong"}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!amount || Number(amount) <= 0 || create.isPending} onClick={() => void handleSave()}>
              {create.isPending ? "Saving…" : `Record ${type === "INCOME" ? "income" : "expense"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
