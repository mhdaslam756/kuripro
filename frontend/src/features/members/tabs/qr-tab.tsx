import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMemberQrCode } from "../use-members";
import type { Member } from "../types";

export function QrTab({ member }: { member: Member }) {
  const { data: qrDataUrl, isLoading } = useMemberQrCode(member.id, true);

  function handleDownload() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${member.memberCode}-qr.png`;
    link.click();
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <p className="text-sm text-text-secondary">
          Scan this code during collection to pull up {member.name}'s profile instantly.
        </p>
        {isLoading ? (
          <Skeleton className="h-64 w-64" />
        ) : qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR code for ${member.name}`}
            className="h-64 w-64 rounded-lg border border-border-default bg-white p-2"
          />
        ) : (
          <p className="text-sm text-bad-fg">Couldn't generate the QR code.</p>
        )}
        <p className="font-mono text-sm text-text-secondary">{member.memberCode}</p>
        <Button variant="outline" disabled={!qrDataUrl} onClick={handleDownload}>
          Download PNG
        </Button>
      </CardContent>
    </Card>
  );
}
