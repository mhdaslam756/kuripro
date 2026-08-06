import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CloudUpload,
  Fingerprint,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { promptInstall } from "@/lib/pwa-runtime";
import {
  disablePush,
  enablePush,
  hasRegisteredPush,
  isPushConfigured,
  isPushSupported,
  notificationPermission,
} from "@/lib/push";
import { useIsStandalone, useOnlineStatus, usePwa } from "@/lib/use-pwa";
import { isWebAuthnSupported, platformAuthenticatorAvailable } from "@/lib/webauthn";
import { countQueue } from "@/features/collections/offline-queue";
import { flushOutbox } from "@/features/collections/sync-outbox";
import { useAddPasskey, useDeletePasskey, usePasskeys } from "./use-device";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

function Capability({ icon, title, description, status, tone = "neutral", children }: {
  icon: ReactNode;
  title: string;
  description: string;
  status: string;
  tone?: Tone;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-brand-solid">{icon}</span>
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge variant={tone}>{status}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

// --- Install ---
function InstallCard() {
  const { canInstall, installed } = usePwa();
  const standalone = useIsStandalone();
  const already = standalone || installed;
  return (
    <Capability
      icon={<Smartphone className="size-5" />}
      title="Install app"
      description="Add KuriPro to your home screen to launch it like a native app, full-screen and offline-ready."
      status={already ? "Installed" : canInstall ? "Ready to install" : "Not available"}
      tone={already ? "success" : canInstall ? "info" : "neutral"}
    >
      {already ? (
        <p className="text-sm text-text-secondary">You're running the installed app. 🎉</p>
      ) : canInstall ? (
        <Button onClick={() => void promptInstall()}>Install KuriPro</Button>
      ) : (
        <p className="text-sm text-text-secondary">
          Use your browser's “Install app” / “Add to Home Screen” option, or open KuriPro over HTTPS to enable it.
        </p>
      )}
    </Capability>
  );
}

// --- Push ---
function PushCard() {
  const [permission, setPermission] = useState(notificationPermission());
  const [registered, setRegistered] = useState(hasRegisteredPush());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const supported = isPushSupported();
  const configured = isPushConfigured();

  async function enable() {
    setBusy(true);
    setError(undefined);
    const result = await enablePush();
    if (result.ok) {
      setRegistered(true);
      setPermission("granted");
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    await disablePush();
    setRegistered(false);
    setBusy(false);
  }

  const status = !supported ? "Not supported" : !configured ? "Not configured" : registered ? "On" : permission === "denied" ? "Blocked" : "Off";
  const tone: Tone = registered ? "success" : permission === "denied" ? "danger" : "neutral";

  return (
    <Capability
      icon={<Bell className="size-5" />}
      title="Push notifications"
      description="Get reminders, receipts and winner alerts pushed to this device — even when the app is closed."
      status={status}
      tone={tone}
    >
      {!supported ? (
        <p className="text-sm text-text-secondary">This browser doesn't support push notifications.</p>
      ) : !configured ? (
        <p className="text-sm text-text-secondary">
          Push delivery isn't configured on this build. Add the Firebase web keys to enable it — the rest of the flow is ready.
        </p>
      ) : registered ? (
        <Button variant="outline" disabled={busy} onClick={() => void disable()}>
          Turn off on this device
        </Button>
      ) : (
        <Button disabled={busy || permission === "denied"} onClick={() => void enable()}>
          {busy ? "Enabling…" : "Enable push on this device"}
        </Button>
      )}
      {permission === "denied" ? (
        <p className="mt-2 text-xs text-text-secondary">Notifications are blocked in your browser settings for this site.</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-bad-fg">{error}</p> : null}
    </Capability>
  );
}

// --- Biometric / passkeys ---
function PasskeyCard() {
  const supported = isWebAuthnSupported();
  const [platformAvailable, setPlatformAvailable] = useState<boolean | null>(null);
  const { data: passkeys, isLoading } = usePasskeys();
  const addPasskey = useAddPasskey();
  const deletePasskey = useDeletePasskey();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (supported) void platformAuthenticatorAvailable().then(setPlatformAvailable);
  }, [supported]);

  async function add() {
    setError(undefined);
    try {
      await addPasskey.mutateAsync(label.trim() || undefined);
      setLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey registration was cancelled or failed.");
    }
  }

  const count = passkeys?.length ?? 0;
  return (
    <Capability
      icon={<Fingerprint className="size-5" />}
      title="Biometric login (passkeys)"
      description="Sign in with Face ID, Touch ID or your device PIN instead of a password. Passkeys are phishing-resistant."
      status={!supported ? "Not supported" : count > 0 ? `${count} registered` : "None yet"}
      tone={!supported ? "neutral" : count > 0 ? "success" : "info"}
    >
      {!supported ? (
        <p className="text-sm text-text-secondary">This browser doesn't support passkeys.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {platformAvailable === false ? (
            <p className="text-xs text-text-secondary">
              No built-in biometric sensor detected — you can still register a security key or phone passkey.
            </p>
          ) : null}

          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : count > 0 ? (
            <ul className="flex flex-col divide-y divide-border-default rounded-md border border-border-default">
              {passkeys!.map((pk) => (
                <li key={pk.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{pk.deviceLabel}</p>
                    <p className="text-xs text-text-secondary">
                      Added {formatDateTime(pk.createdAt)}
                      {pk.lastUsedAt ? ` · last used ${formatDateTime(pk.lastUsedAt)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deletePasskey.mutateAsync(pk.id)}
                    className="rounded p-1.5 text-text-secondary hover:bg-surface-muted hover:text-bad-fg"
                    aria-label={`Remove ${pk.deviceLabel}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex gap-2">
            <Input placeholder="Name this device (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Button disabled={addPasskey.isPending} onClick={() => void add()}>
              {addPasskey.isPending ? "Waiting…" : "Add passkey"}
            </Button>
          </div>
          {error ? <p className="text-sm text-bad-fg">{error}</p> : null}
        </div>
      )}
    </Capability>
  );
}

// --- Offline & storage ---
function OfflineCard() {
  const online = useOnlineStatus();
  const [queued, setQueued] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => void countQueue().then(setQueued);
  useEffect(refresh, []);

  async function sync() {
    setBusy(true);
    try {
      await flushOutbox();
    } finally {
      refresh();
      setBusy(false);
    }
  }

  return (
    <Capability
      icon={online ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
      title="Offline mode & storage"
      description="Collections captured offline are saved to on-device storage (IndexedDB) and synced automatically when you reconnect."
      status={online ? "Online" : "Offline"}
      tone={online ? "success" : "warning"}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {queued === null ? "Checking queue…" : queued === 0 ? "Nothing waiting to sync." : `${queued} collection${queued === 1 ? "" : "s"} queued on this device.`}
        </p>
        <Button variant="outline" size="sm" disabled={busy || !online || queued === 0} onClick={() => void sync()}>
          <CloudUpload className="size-4" /> {busy ? "Syncing…" : "Sync now"}
        </Button>
      </div>
    </Capability>
  );
}

export function DevicePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-semibold text-text-primary">Device &amp; Security</h1>
        <p className="text-sm text-text-secondary">
          Install the app, sign in with biometrics, and manage notifications and offline data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InstallCard />
        <PushCard />
        <PasskeyCard />
        <OfflineCard />
      </div>
    </div>
  );
}
