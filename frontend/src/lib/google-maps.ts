/**
 * Google Maps Places loader with graceful degradation.
 *
 * When `VITE_GOOGLE_MAPS_API_KEY` is configured, the Maps JS API (Places library) is loaded once
 * and memoized. When it is NOT configured — as in this sandbox — `isGoogleMapsConfigured` is false
 * and callers fall back to plain address fields with no autocomplete and no map preview. This is
 * the same honest-gap pattern used for the OTP/SMS provider: the integration is fully wired, it
 * simply stays dormant until a key is supplied, so nothing breaks in its absence.
 */

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY: string | undefined = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined;

export const isGoogleMapsConfigured = Boolean(API_KEY);

let loaderPromise: Promise<typeof google | null> | null = null;

export function loadGoogleMaps(): Promise<typeof google | null> {
  if (!API_KEY) return Promise.resolve(null);
  if (typeof window !== "undefined" && window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  loaderPromise ??= new Promise<typeof google | null>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google ?? null);
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export interface ResolvedPlace {
  line1: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  formattedAddress?: string;
}

/** Maps a Google Places PlaceResult into our flat address shape. */
export function placeResultToAddress(place: google.maps.places.PlaceResult): ResolvedPlace {
  const components = place.address_components ?? [];
  const get = (type: string): string =>
    components.find((component) => component.types.includes(type))?.long_name ?? "";

  const streetNumber = get("street_number");
  const route = get("route");
  const sublocality = get("sublocality") || get("neighborhood");
  const line1 = [streetNumber, route].filter(Boolean).join(" ") || sublocality || place.name || "";

  return {
    line1,
    city: get("locality") || get("administrative_area_level_2"),
    state: get("administrative_area_level_1"),
    pincode: get("postal_code"),
    country: get("country") || "India",
    lat: place.geometry?.location?.lat(),
    lng: place.geometry?.location?.lng(),
    placeId: place.place_id,
    formattedAddress: place.formatted_address,
  };
}
