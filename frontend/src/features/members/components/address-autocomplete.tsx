import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { isGoogleMapsConfigured, loadGoogleMaps, placeResultToAddress, type ResolvedPlace } from "@/lib/google-maps";

interface AddressAutocompleteProps {
  id: string;
  defaultValue?: string;
  onResolved: (place: ResolvedPlace) => void;
  onTextChange?: (value: string) => void;
  placeholder?: string;
}

/**
 * Street-address input. When a Google Maps key is configured it attaches Places Autocomplete and
 * emits a fully-resolved address (with lat/lng) on selection. When it is NOT configured it degrades
 * to a plain text input — the surrounding form still captures city/state/pincode manually — so the
 * registration flow works identically with or without Maps.
 */
export function AddressAutocomplete({
  id,
  defaultValue,
  onResolved,
  onTextChange,
  placeholder,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isGoogleMapsConfigured) return;
    let autocomplete: google.maps.places.Autocomplete | undefined;
    let cancelled = false;

    void loadGoogleMaps().then((google) => {
      if (cancelled || !google || !inputRef.current) return;
      autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "in" },
        fields: ["address_components", "geometry", "formatted_address", "name", "place_id"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete?.getPlace();
        if (place) onResolved(placeResultToAddress(place));
      });
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [onResolved]);

  return (
    <div className="relative">
      <Input
        id={id}
        ref={inputRef}
        defaultValue={defaultValue}
        placeholder={placeholder ?? (isGoogleMapsConfigured ? "Search for an address…" : "Street address")}
        onChange={(event) => onTextChange?.(event.target.value)}
        autoComplete="off"
      />
      {isGoogleMapsConfigured && ready ? (
        <MapPin className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-accent-primary" size={16} />
      ) : null}
    </div>
  );
}

/** A small notice shown near address fields when Maps isn't configured, so the gap is explicit. */
export function MapsUnconfiguredHint() {
  if (isGoogleMapsConfigured) return null;
  return (
    <p className="text-xs text-text-secondary">
      Address autocomplete &amp; map preview activate once a Google Maps API key is configured. Enter the address
      manually for now.
    </p>
  );
}
