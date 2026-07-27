import { Download, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { reloadForUpdate } from "@/lib/pwa-runtime";
import { useOnlineStatus, usePwa } from "@/lib/use-pwa";

/**
 * App-wide PWA affordances rendered above everything: an offline indicator while connectivity is
 * down, and a "new version" prompt when the service worker has an update waiting.
 */
export function PwaStatus() {
  const online = useOnlineStatus();
  const { updateReady } = usePwa();

  return (
    <>
      {!online ? (
        <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-warn-bg py-1.5 text-center text-xs font-medium text-warn-fg">
          <WifiOff className="size-3.5" aria-hidden />
          You're offline — collections are saved on this device and will sync automatically.
        </div>
      ) : null}

      {updateReady ? (
        <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full border border-border-default bg-surface px-4 py-2 shadow-lg">
          <Download className="size-4 text-brand-solid" aria-hidden />
          <span className="text-sm text-text-primary">A new version of KuriPro is ready.</span>
          <Button size="sm" onClick={() => void reloadForUpdate()}>
            <RefreshCw className="size-3.5" /> Reload
          </Button>
        </div>
      ) : null}
    </>
  );
}
