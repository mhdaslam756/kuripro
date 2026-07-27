import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Organization } from "./types";

const STATUS_VARIANT: Record<Organization["subscription"]["status"], "success" | "warning" | "danger" | "info"> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELLED: "danger",
};

export function SubscriptionTab({ organization }: { organization: Organization }) {
  const { subscription } = organization;
  const periodEnd = new Date(subscription.currentPeriodEnd);

  return (
    <Card className="max-w-md">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Plan</p>
            <p className="font-display text-xl font-semibold text-text-primary">{subscription.plan}</p>
          </div>
          <Badge variant={STATUS_VARIANT[subscription.status]}>{subscription.status}</Badge>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">
            {subscription.status === "TRIALING" ? "Trial ends" : "Current period ends"}
          </p>
          <p className="text-sm text-text-primary">
            {periodEnd.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <p className="text-xs text-text-secondary">
          Online billing isn't set up yet — reach out to KuriPro support to change your plan.
        </p>
      </CardContent>
    </Card>
  );
}
