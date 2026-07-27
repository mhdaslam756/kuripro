import { useEffect, useState } from "react";

import { getPwaState, subscribePwa, type PwaState } from "./pwa-runtime";
import { isStandalone } from "./pwa";

/** Reactive PWA install/update state (subscribes to the shared runtime store). */
export function usePwa(): PwaState {
  const [state, setState] = useState<PwaState>(getPwaState);
  useEffect(() => subscribePwa(() => setState(getPwaState())), []);
  return state;
}

/** Tracks browser connectivity, updating on the `online`/`offline` events. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** True when the app is already running as an installed standalone PWA. */
export function useIsStandalone(): boolean {
  const [standalone] = useState(() => (typeof window === "undefined" ? false : isStandalone()));
  return standalone;
}
