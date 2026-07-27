import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCamera } from "@/lib/use-camera";

/**
 * Live camera preview with a capture button. Produces a JPEG data URL — usable for capturing a
 * member's photo or a document on the spot (rear camera by default).
 */
export function CameraCapture({ onCapture }: { onCapture?: (dataUrl: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { supported, status, error, start, stop } = useCamera();
  const [photo, setPhoto] = useState<string | null>(null);

  const begin = useCallback(() => {
    if (videoRef.current) void start(videoRef.current, "environment");
  }, [start]);

  useEffect(() => {
    begin();
    return () => stop();
  }, [begin, stop]);

  function capture(): void {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhoto(dataUrl);
    stop();
    onCapture?.(dataUrl);
  }

  function retake(): void {
    setPhoto(null);
    begin();
  }

  if (!supported || status === "unavailable") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border-default py-10 text-center">
        <CameraOff className="size-6 text-text-secondary" aria-hidden />
        <p className="text-sm text-text-secondary">No camera is available on this device.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border border-border-default bg-black">
        {photo ? (
          <img src={photo} alt="Captured" className="aspect-video w-full object-contain" />
        ) : (
          <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
        )}
      </div>

      {status === "denied" ? <p className="text-sm text-bad-fg">{error ?? "Camera permission was denied."}</p> : null}

      <div className="flex justify-center gap-2">
        {photo ? (
          <Button variant="outline" onClick={retake}>
            <RotateCcw className="size-4" /> Retake
          </Button>
        ) : (
          <Button onClick={capture} disabled={status !== "live"}>
            <Camera className="size-4" /> {status === "starting" ? "Starting…" : "Capture"}
          </Button>
        )}
      </div>
    </div>
  );
}
