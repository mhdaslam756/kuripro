import { registerSW } from "virtual:pwa-register";

/**
 * The PWA runtime store: registers the service worker, tracks whether a new version is waiting, and
 * captures the browser's install prompt. Kept framework-agnostic (a tiny observable) so React hooks
 * in `use-pwa.ts` can subscribe without the registration happening more than once.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PwaState {
  updateReady: boolean;
  offlineReady: boolean;
  canInstall: boolean;
  installed: boolean;
}

let state: PwaState = { updateReady: false, offlineReady: false, canInstall: false, installed: false };
const listeners = new Set<() => void>();
let deferredInstall: BeforeInstallPromptEvent | undefined;
let reloadSW: ((reload?: boolean) => Promise<void>) | undefined;
let started = false;

function set(patch: Partial<PwaState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaState(): PwaState {
  return state;
}

/** Registers the SW and wires install/update signals. Safe to call once at app start. */
export function initPwa(): void {
  if (started) return;
  started = true;

  reloadSW = registerSW({
    immediate: true,
    onNeedRefresh: () => set({ updateReady: true }),
    onOfflineReady: () => set({ offlineReady: true }),
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstall = event as BeforeInstallPromptEvent;
    set({ canInstall: true });
  });

  window.addEventListener("appinstalled", () => {
    deferredInstall = undefined;
    set({ canInstall: false, installed: true });
  });
}

/** Reloads to activate a waiting service worker (the update flow). */
export async function reloadForUpdate(): Promise<void> {
  await reloadSW?.(true);
}

/** Shows the native install prompt; resolves to whether the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredInstall) return false;
  await deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  deferredInstall = undefined;
  set({ canInstall: false });
  return outcome === "accepted";
}
