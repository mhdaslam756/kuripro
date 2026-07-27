import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KycStatusBadge, MemberStatusBadge, RiskBandBadge } from "./components/status-badges";
import { KycTab } from "./tabs/kyc-tab";
import { FamilyTab } from "./tabs/family-tab";
import { GuarantorsTab } from "./tabs/guarantors-tab";
import { NomineesTab } from "./tabs/nominees-tab";
import { PaymentsTab } from "./tabs/payments-tab";
import { PrizesTab } from "./tabs/prizes-tab";
import { ProfileTab } from "./tabs/profile-tab";
import { QrTab } from "./tabs/qr-tab";
import { RiskTab } from "./tabs/risk-tab";
import { TimelineTab } from "./tabs/timeline-tab";
import { useMember } from "./use-members";

const TAB_ITEMS = [
  "Profile",
  "KYC & Documents",
  "Nominees",
  "Family",
  "Guarantors",
  "Risk",
  "Payments",
  "Prizes",
  "Timeline",
  "QR Code",
] as const;

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: member, isLoading, isError } = useMember(id);

  return (
    <div>
      <Link
        to="/members"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={15} /> All members
      </Link>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !member ? (
        <p className="text-sm text-bad-fg">Couldn't load this member.</p>
      ) : (
        <>
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 font-display text-xl font-semibold text-brand-700">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold text-text-primary">{member.name}</h1>
                <p className="font-mono text-xs text-text-secondary">{member.memberCode} · {member.phone}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MemberStatusBadge status={member.status} />
              <KycStatusBadge status={member.kyc.status} />
              {member.riskScore ? <RiskBandBadge band={member.riskScore.band} value={member.riskScore.value} /> : null}
            </div>
          </header>

          <Tabs defaultValue="Profile">
            <TabsList className="flex-wrap">
              {TAB_ITEMS.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="Profile">
              <ProfileTab member={member} />
            </TabsContent>
            <TabsContent value="KYC & Documents">
              <KycTab member={member} />
            </TabsContent>
            <TabsContent value="Nominees">
              <NomineesTab memberId={member.id} />
            </TabsContent>
            <TabsContent value="Family">
              <FamilyTab memberId={member.id} />
            </TabsContent>
            <TabsContent value="Guarantors">
              <GuarantorsTab memberId={member.id} />
            </TabsContent>
            <TabsContent value="Risk">
              <RiskTab member={member} />
            </TabsContent>
            <TabsContent value="Payments">
              <PaymentsTab memberId={member.id} />
            </TabsContent>
            <TabsContent value="Prizes">
              <PrizesTab memberId={member.id} />
            </TabsContent>
            <TabsContent value="Timeline">
              <TimelineTab memberId={member.id} />
            </TabsContent>
            <TabsContent value="QR Code">
              <QrTab member={member} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
