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

/** True when running as an installed app (Android/desktop display-mode, or iOS Home Screen). */
function isInstalledApp(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Installed app only: no pinch-zoom in or out. CSS (touch-action) covers Android; the viewport meta and
 * gesture events cover iOS, which ignores both. Browser tabs keep zoom for accessibility.
 */
function lockZoom(): void {
  if (!isInstalledApp()) return;

  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && !viewport.getAttribute("content")?.includes("user-scalable")) {
    viewport.setAttribute("content", `${viewport.getAttribute("content")}, minimum-scale=1, maximum-scale=1, user-scalable=no`);
  }

  const block = (e: Event) => e.preventDefault();
  for (const type of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(type, block);
  document.addEventListener("wheel", (e) => e.ctrlKey && e.preventDefault(), { passive: false });
  document.addEventListener("touchmove", (e) => e.touches.length > 1 && e.preventDefault(), { passive: false });
}

/** Registers the SW and wires install/update signals. Safe to call once at app start. */
export function initPwa(): void {
  if (started) return;
  started = true;
  lockZoom();

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
