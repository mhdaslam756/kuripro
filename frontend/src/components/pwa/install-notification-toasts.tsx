import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isIosDevice, isStandalone } from "@/lib/pwa";
import { promptInstall } from "@/lib/pwa-runtime";
import { usePwa } from "@/lib/use-pwa";

/**
 * Global floating alert cards for:
 * 1. Installing the PWA App (with special guided flow for iOS Safari)
 * 2. Enabling Push Notifications (reminders, dues, auctions)
 */
export function AppInstallNotificationToasts() {
  const location = useLocation();
  const isAuthPage =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/portal") ||
    location.pathname.startsWith("/super-admin");

  const { canInstall, installed } = usePwa();
  const [showInstallToast, setShowInstallToast] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (isAuthPage) return;
    // Check if app is already running in standalone mode or already installed
    const standalone = isStandalone() || installed;
    const installDismissed = sessionStorage.getItem("kuripro_install_dismissed") === "true";
    const isIos = isIosDevice();

    // 1. Install Prompt Check
    if (!standalone && !installDismissed && (canInstall || isIos)) {
      const timer = setTimeout(() => {
        setShowInstallToast(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [canInstall, installed, isAuthPage]);

  if (isAuthPage) return null;

  async function handleInstall() {
    if (isIosDevice()) {
      setShowIosGuide(true);
      return;
    }

    setIsInstalling(true);
    try {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success("KuriPro app installed successfully!");
        setShowInstallToast(false);
      } else {
        setShowInstallToast(false);
        sessionStorage.setItem("kuripro_install_dismissed", "true");
      }
    } catch {
      setShowInstallToast(false);
    } finally {
      setIsInstalling(false);
    }
  }

  function dismissInstall() {
    setShowInstallToast(false);
    sessionStorage.setItem("kuripro_install_dismissed", "true");
  }

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 z-[9999] mx-auto flex max-w-md flex-col gap-3 sm:bottom-6 sm:right-6 sm:left-auto sm:mx-0 select-none pointer-events-none">
        {/* PWA Install Alert Card */}
        {showInstallToast ? (
          <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-bg-surface/95 p-3.5 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3">
              <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 font-display font-bold text-white shadow-md text-lg">
                K
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-bg-surface" />
              </div>
              <div>
                <p className="font-display text-xs font-bold text-text-primary flex items-center gap-1.5">
                  Install KuriPro App
                  <span className="rounded-full bg-brand-500/15 px-1.5 py-0.2 text-[9px] font-bold text-accent-primary">
                    Fast & Offline
                  </span>
                </p>
                <p className="text-[11px] text-text-secondary line-clamp-1">
                  Launch from home screen with full offline receipt capture
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                disabled={isInstalling}
                onClick={() => void handleInstall()}
                className="h-8 gap-1 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3 text-xs font-bold shadow-xs active-bounce"
              >
                <Download size={13} /> {isInstalling ? "Installing…" : "Install"}
              </Button>
              <button
                type="button"
                onClick={dismissInstall}
                className="flex size-7 items-center justify-center rounded-full text-text-secondary hover:bg-bg-raised active-bounce"
                aria-label="Dismiss Install Prompt"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* iOS Safari Installation Instructions Dialog */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white font-display text-xl font-bold shadow-md">
              K
            </div>
            <DialogTitle className="font-display text-lg font-bold text-text-primary">
              Install KuriPro on iOS
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Follow these simple steps in Safari to add KuriPro to your home screen:
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-3 text-xs">
            <div className="flex items-start gap-3 rounded-2xl border border-border-default/80 bg-bg-raised p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-primary text-white font-bold text-[11px]">
                1
              </span>
              <div>
                <p className="font-semibold text-text-primary">Tap the Share button</p>
                <p className="mt-0.5 text-text-secondary">
                  Look for the <Share size={13} className="inline mx-0.5 text-accent-primary" /> icon at the bottom of your Safari screen.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border-default/80 bg-bg-raised p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-primary text-white font-bold text-[11px]">
                2
              </span>
              <div>
                <p className="font-semibold text-text-primary">Select "Add to Home Screen"</p>
                <p className="mt-0.5 text-text-secondary">
                  Scroll down the share menu options and tap <strong>"Add to Home Screen"</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border-default/80 bg-bg-raised p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-primary text-white font-bold text-[11px]">
                3
              </span>
              <div>
                <p className="font-semibold text-text-primary">Tap "Add" in the top right</p>
                <p className="mt-0.5 text-text-secondary">
                  KuriPro will appear on your device home screen like a native app.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              className="w-full rounded-xl font-bold"
              onClick={() => setShowIosGuide(false)}
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Compact Header Action Button for Installing the PWA App.
 * Automatically hidden if app is already running standalone.
 */
export function HeaderInstallAppButton() {
  const { canInstall, installed } = usePwa();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const standalone = isStandalone() || installed;

  if (standalone || (!canInstall && !isIosDevice())) return null;

  async function handleInstall() {
    if (isIosDevice()) {
      setShowIosGuide(true);
      return;
    }
    try {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success("KuriPro installed successfully!");
      }
    } catch {
      // ignore
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleInstall()}
        title="Install KuriPro App"
        className="active-bounce flex items-center gap-1.5 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-raised px-2.5 py-1.5 text-xs font-semibold text-text-primary transition-all shadow-xs"
        aria-label="Install App"
      >
        <Download size={13} className="text-accent-primary shrink-0" />
        <span className="hidden md:inline">Install App</span>
      </button>

      {/* iOS Dialog */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="font-display text-lg font-bold text-text-primary">
              Install KuriPro on iOS
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Tap the <strong>Share</strong> button (<Share size={12} className="inline text-accent-primary" />) in Safari, then tap <strong>"Add to Home Screen"</strong>.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="mt-4 w-full rounded-xl font-bold" onClick={() => setShowIosGuide(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function HeaderPushNotificationButton() {
  return null;
}
