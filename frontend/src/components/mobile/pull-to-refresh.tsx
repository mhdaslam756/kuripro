import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72;
const MAX_PULL = 110;

/**
 * Native-style pull-to-refresh for the installed app. Starts only when the page is scrolled to the
 * top and the finger drags down; on release past the threshold every active query is refetched.
 * Touch-only, so it never affects desktop.
 */
export function PullToRefresh() {
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    function reset() {
      startY.current = null;
      pullRef.current = 0;
      setPull(0);
    }

    function onStart(e: TouchEvent) {
      // Ignore drags that begin inside an open dialog/sheet or while the page is scrolled.
      const target = e.target as HTMLElement | null;
      const scrolled = (document.getElementById("app-scroll")?.scrollTop ?? 0) > 0 || window.scrollY > 0;
      if (scrolled || target?.closest("[role='dialog'], [data-no-ptr]")) return;
      startY.current = e.touches[0]!.clientY;
    }

    function onMove(e: TouchEvent) {
      if (startY.current === null) return;
      const delta = e.touches[0]!.clientY - startY.current;
      if (delta <= 0) {
        reset();
        return;
      }
      pullRef.current = Math.min(MAX_PULL, delta * 0.5);
      setPull(pullRef.current);
    }

    function onEnd() {
      const shouldRefresh = pullRef.current >= THRESHOLD;
      reset();
      if (!shouldRefresh) return;
      setRefreshing(true);
      void queryClient.invalidateQueries().finally(() => setRefreshing(false));
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", reset);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, [queryClient]);

  const visible = refreshing || pull > 8;
  const offset = refreshing ? 56 : pull;

  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-30 flex justify-center lg:hidden"
      style={{ transform: `translateY(${visible ? offset - 40 : -48}px)`, opacity: visible ? 1 : 0, transition: pull ? "none" : "transform 200ms, opacity 200ms" }}
    >
      <span className="flex size-9 items-center justify-center rounded-full border border-border-default bg-bg-surface text-accent-primary shadow-md">
        <RefreshCw
          size={16}
          className={refreshing ? "animate-spin" : ""}
          style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        />
      </span>
    </div>
  );
}
