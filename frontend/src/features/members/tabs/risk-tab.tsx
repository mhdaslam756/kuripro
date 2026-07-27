import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/format";
import { RiskBandBadge } from "../components/status-badges";
import { EmptyState } from "./nominees-tab";
import type { Member } from "../types";
import { useRecomputeRiskScore } from "../use-members";

export function RiskTab({ member }: { member: Member }) {
  const { hasPermission } = useAuth();
  const recompute = useRecomputeRiskScore(member.id);
  const score = member.riskScore;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          A transparent, rule-based score from 0 (safest) to 100 (riskiest). Every point is explained below.
        </p>
        {hasPermission("members.view") ? (
          <Button size="sm" variant="outline" disabled={recompute.isPending} onClick={() => void recompute.mutateAsync()}>
            <RefreshCw size={15} className={recompute.isPending ? "animate-spin" : ""} /> Recompute
          </Button>
        ) : null}
      </div>

      {!score ? (
        <EmptyState label="No risk score computed yet. Click Recompute to generate one." />
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Risk score: {score.value} / 100</CardTitle>
              <p className="mt-1 text-xs text-text-secondary">Last computed {formatDateTime(score.computedAt)}</p>
            </div>
            <RiskBandBadge band={score.band} />
          </CardHeader>
          <CardContent>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-bg-raised">
              <div
                className="h-full rounded-full bg-accent-primary"
                style={{ width: `${score.value}%` }}
              />
            </div>
            <ul className="flex flex-col divide-y divide-border-default">
              {score.factors.map((factor, index) => (
                <li key={index} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-text-primary">{factor.label}</span>
                  <span
                    className={
                      factor.points > 0 ? "font-medium text-bad-fg" : factor.points < 0 ? "font-medium text-good-fg" : "text-text-secondary"
                    }
                  >
                    {factor.points > 0 ? "+" : ""}
                    {factor.points}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
