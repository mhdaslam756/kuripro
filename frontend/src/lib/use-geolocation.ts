import { useCallback, useState } from "react";

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

export type GeolocationStatus = "idle" | "prompting" | "granted" | "denied" | "unavailable" | "error";

export interface GeolocationState {
  status: GeolocationStatus;
  coords?: Coordinates;
  error?: string;
}

/** Wraps the Geolocation API with explicit permission states, for GPS capture (member address, collection stamp). */
export function useGeolocation() {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [state, setState] = useState<GeolocationState>({ status: supported ? "idle" : "unavailable" });

  const request = useCallback(() => {
    if (!supported) {
      setState({ status: "unavailable", error: "This device doesn't support location." });
      return;
    }
    setState({ status: "prompting" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "granted",
          coords: {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
            accuracy: Math.round(position.coords.accuracy),
          },
        });
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        setState({
          status: denied ? "denied" : "error",
          error: denied ? "Location permission was denied." : error.message,
        });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }, [supported]);

  const reset = useCallback(() => setState({ status: supported ? "idle" : "unavailable" }), [supported]);

  return { supported, state, request, reset };
}
