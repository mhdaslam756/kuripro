import { Bell, Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { enablePush, isPushSupported, notificationPermission } from "@/lib/push";
import { promptInstall } from "@/lib/pwa-runtime";
import { useIsStandalone, usePwa } from "@/lib/use-pwa";

export function AppInstallNotificationToasts() {
  const pwa = usePwa();
  const isStandalone = useIsStandalone();

  const [showInstallToast, setShowInstallToast] = useState(false);
  const [showPushToast, setShowPushToast] = useState(false);

  useEffect(() => {
    // Disabled temporary notification toast auto-popup
  }, []);

  async function handleInstall() {
    try {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success("KuriPro installed successfully!");
        setShowInstallToast(false);
      } else {
        setShowInstallToast(false);
        sessionStorage.setItem("kuripro_install_dismissed", "true");
      }
    } catch {
      setShowInstallToast(false);
    }
  }

  function dismissInstall() {
    setShowInstallToast(false);
    sessionStorage.setItem("kuripro_install_dismissed", "true");
  }

  async function handleEnablePush() {
    try {
      const res = await enablePush();
      if (!res.ok) {
        toast.error(res.error || "Could not enable push notifications");
        setShowPushToast(false);
        sessionStorage.setItem("kuripro_push_dismissed", "true");
      } else {
        toast.success("Push notifications enabled!");
        setShowPushToast(false);
      }
    } catch {
      setShowPushToast(false);
    }
  }

  function dismissPush() {
    setShowPushToast(false);
    sessionStorage.setItem("kuripro_push_dismissed", "true");
  }

  if (!showInstallToast && !showPushToast) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] mx-auto flex max-w-md flex-col gap-2.5 sm:bottom-6 sm:right-6 sm:mx-0 animate-in slide-in-from-bottom duration-300 select-none">
      {/* PWA Install Banner */}
      {showInstallToast ? (
        <div className="flex items-center justify-between rounded-2xl border border-border-default/90 bg-bg-surface p-3.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 font-display font-bold text-white shadow-sm text-base">
              K
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary">Install KuriPro App</p>
              <p className="text-[11px] text-text-secondary">Full native mobile app &amp; offline mode</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="flex items-center gap-1 rounded-xl bg-accent-primary px-3 py-1.5 text-xs font-bold text-text-on-brand shadow-xs transition-transform active:scale-95"
            >
              <Download size={13} /> Install
            </button>
            <button
              type="button"
              onClick={dismissInstall}
              className="flex size-7 items-center justify-center rounded-full text-text-secondary hover:bg-bg-raised"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Push Notification Banner */}
      {showPushToast ? (
        <div className="flex items-center justify-between rounded-2xl border border-border-default/90 bg-bg-surface p-3.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-accent-primary shadow-xs">
              <Bell size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary">Enable Notifications</p>
              <p className="text-[11px] text-text-secondary">Instant alerts for dues &amp; auctions</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleEnablePush()}
              className="flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
            >
              Enable
            </button>
            <button
              type="button"
              onClick={dismissPush}
              className="flex size-7 items-center justify-center rounded-full text-text-secondary hover:bg-bg-raised"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
