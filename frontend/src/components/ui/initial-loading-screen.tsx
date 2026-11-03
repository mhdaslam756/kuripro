/** True when index.html decided this launch is the first of the installed phone app. */
const isFirstRun = typeof document !== "undefined" && document.documentElement.hasAttribute("data-first-run");

/**
 * Shown while the session is restored at start-up. Normally just a thin progress bar on the page
 * background, with no logo. On the very first launch of the installed phone app it is the splash image
 * instead (index.html shows the same image, so the hand-over is seamless).
 */
export function InitialLoadingScreen() {
  if (isFirstRun) {
    return (
      <div role="status" aria-label="Loading KuriPro" className="fixed inset-0 z-50 bg-[#3029c7]">
        <img src="/home.webp" alt="" decoding="async" className="size-full object-cover object-center" />
      </div>
    );
  }

  return (
    <div role="status" aria-label="Loading" className="fixed inset-0 z-50 bg-bg-app">
      <div className="relative h-[3px] w-full overflow-hidden bg-accent-primary/15">
        <div className="boot-progress absolute inset-y-0 left-0 w-2/5 rounded-full bg-gradient-to-r from-accent-primary to-[#a78bfa]" />
      </div>
    </div>
  );
}
