import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "starting" | "live" | "denied" | "unavailable" | "error";

export type CameraFacing = "environment" | "user";

/** Manages a getUserMedia camera stream with explicit permission/error states. */
export function useCamera() {
  const supported =
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
  const [status, setStatus] = useState<CameraStatus>(supported ? "idle" : "unavailable");
  const [error, setError] = useState<string | undefined>();
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStatus(supported ? "idle" : "unavailable");
  }, [supported]);

  const start = useCallback(
    async (video: HTMLVideoElement, facingMode: CameraFacing = "environment"): Promise<MediaStream | undefined> => {
      if (!supported) {
        setStatus("unavailable");
        return undefined;
      }
      try {
        setStatus("starting");
        setError(undefined);
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        setStatus("live");
        return stream;
      } catch (e) {
        const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
        setStatus(denied ? "denied" : "error");
        setError(denied ? "Camera permission was denied." : e instanceof Error ? e.message : "Could not start the camera.");
        return undefined;
      }
    },
    [supported],
  );

  // Always release the camera when the consumer unmounts.
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  return { supported, status, error, start, stop, streamRef };
}
