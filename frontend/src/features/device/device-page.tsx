import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CloudUpload,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { countQueue } from "@/features/collections/offline-queue";
import { flushOutbox } from "@/features/collections/sync-outbox";

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
          Use your browser's “Install app” or “Add to Home Screen” option to install KuriPro on this device.
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

  // Check if we have a real Web Push subscription vs a fallback SSE token
  function hasRealWebPush(): boolean {
    const token = localStorage.getItem("kuripro_push_token");
    return Boolean(token && token.includes('"endpoint"'));
  }

  const [isRealPush, setIsRealPush] = useState(hasRealWebPush());

  // Re-check permission when the user returns to the app (e.g. after changing browser settings)
  useEffect(() => {
    function refresh() {
      setPermission(notificationPermission());
      setRegistered(hasRegisteredPush());
      setIsRealPush(hasRealWebPush());
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refresh();
    });
    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(undefined);
    const result = await enablePush();
    if (result.ok) {
      setRegistered(true);
      setIsRealPush(hasRealWebPush());
      setPermission(notificationPermission());
    } else {
      setError(result.error);
      setPermission(notificationPermission());
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    await disablePush();
    setRegistered(false);
    setIsRealPush(false);
    setBusy(false);
  }

  const status = !supported ? "Not supported" : !configured ? "Unavailable" : registered ? (isRealPush ? "On" : "In-app only") : permission === "denied" ? "Blocked" : "Off";
  const tone: Tone = registered ? (isRealPush ? "success" : "warning") : permission === "denied" ? "danger" : "neutral";

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
          Push notifications are currently unavailable for this organization.
        </p>
      ) : registered ? (
        <div className="flex flex-col gap-2">
          {!isRealPush ? (
            <>
              <p className="text-xs text-text-secondary">
                In-app alerts are active. For background push (when app is closed), tap "Retry background push" below.
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => void enable()}>
                  {busy ? "Retrying…" : "Retry background push"}
                </Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void disable()}>
                  Turn off
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" disabled={busy} onClick={() => void disable()}>
              Turn off on this device
            </Button>
          )}
        </div>
      ) : (
        <Button disabled={busy} onClick={() => void enable()}>
          {busy ? "Enabling…" : "Enable push on this device"}
        </Button>
      )}
      {permission === "denied" && !registered ? (
        <p className="mt-2 text-xs text-text-secondary">
          Notifications are blocked. On Android: open Chrome → tap ⋮ menu → Settings → Site settings → Notifications → find this site and allow it. Then come back and tap "Enable push".
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-bad-fg">{error}</p> : null}
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
      description="Collections captured offline are saved securely on your device and synced automatically when you reconnect."
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
          Install the app and manage notifications and offline data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InstallCard />
        <PushCard />
        <OfflineCard />
      </div>
    </div>
  );
}
