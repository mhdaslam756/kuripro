import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

/** Drag distance (px) past which a swipe down on a sheet's handle closes it. */
const DISMISS_DISTANCE = 110;

/**
 * Swipe-down-to-dismiss for a bottom sheet. Spread the returned handlers on the grab handle and pass
 * the sheet element as `ref`; the sheet follows the finger and either closes or springs back.
 */
export function useSheetDrag(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const start = useRef<number | null>(null);

  return {
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      start.current = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (ref.current) ref.current.style.transition = "none";
    },
    onPointerMove(e: ReactPointerEvent<HTMLElement>) {
      if (start.current === null || !ref.current) return;
      ref.current.style.transform = `translateY(${Math.max(0, e.clientY - start.current)}px)`;
    },
    onPointerUp(e: ReactPointerEvent<HTMLElement>) {
      if (start.current === null) return;
      const dy = e.clientY - start.current;
      start.current = null;
      const el = ref.current;
      if (!el) return;
      el.style.transition = "";
      if (dy > DISMISS_DISTANCE) onClose();
      else el.style.transform = "";
    },
  };
}
