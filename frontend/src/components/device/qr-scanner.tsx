import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

import { useCamera } from "@/lib/use-camera";

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

function nativeDetector(): BarcodeDetectorCtor | undefined {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

/**
 * Live QR scanner. Prefers the native BarcodeDetector API (fast, zero-bundle); falls back to
 * @zxing/browser on Safari/Firefox. Calls `onResult` once with the decoded text, then releases the camera.
 */
export function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { supported, status, error, start, stop } = useCamera();
  const [engine, setEngine] = useState<"native" | "zxing" | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    let rafId = 0;
    let controls: { stop: () => void } | undefined;

    function finish(text: string): void {
      if (doneRef.current) return;
      doneRef.current = true;
      cancelAnimationFrame(rafId);
      controls?.stop();
      stop();
      onResult(text);
    }

    async function run(): Promise<void> {
      const video = videoRef.current;
      if (!video) return;
      const stream = await start(video, "environment");
      if (!stream) return;

      const Detector = nativeDetector();
      if (Detector) {
        setEngine("native");
        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async (): Promise<void> => {
          if (doneRef.current) return;
          try {
            const codes = await detector.detect(video);
            if (codes[0]?.rawValue) return finish(codes[0].rawValue);
          } catch {
            // transient decode error — keep scanning
          }
          rafId = requestAnimationFrame(() => void tick());
        };
        rafId = requestAnimationFrame(() => void tick());
        return;
      }

      setEngine("zxing");
      // @ts-ignore - optional dynamic fallback engine
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      // @ts-ignore
      controls = await reader.decodeFromVideoElement(video, (result: any) => {
        if (result) finish(result.getText());
      });
    }

    void run();
    return () => {
      doneRef.current = true;
      cancelAnimationFrame(rafId);
      controls?.stop();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported || status === "unavailable") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border-default py-10 text-center">
        <CameraOff className="size-6 text-text-secondary" aria-hidden />
        <p className="text-sm text-text-secondary">This device has no camera available for scanning.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-md border border-border-default bg-black">
        <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
        {/* Reticle */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-40 rounded-lg border-2 border-white/70" />
        </div>
      </div>
      {status === "denied" ? (
        <p className="text-sm text-bad-fg">{error ?? "Camera permission was denied."}</p>
      ) : (
        <p className="text-center text-xs text-text-secondary">
          Point the camera at a member's QR code{engine ? ` · ${engine === "native" ? "native scanner" : "zxing"}` : ""}
        </p>
      )}
    </div>
  );
}
