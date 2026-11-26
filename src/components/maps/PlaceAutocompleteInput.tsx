import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  isGoogleMapsConfigured,
  reportIfMapsQuotaError,
  type SelectedPlaceValue,
} from '../../lib/googleMaps';
import { useDebounce } from '../../hooks/useDebounce';

interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: SelectedPlaceValue) => void;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  icon?: React.ReactNode;
  inputClassName?: string;
  wrapperClassName?: string;
  showLocateButton?: boolean;
  locationBias?: google.maps.LatLngLiteral | null;
}

const LivePlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Search a location',
  ariaLabel,
  required = false,
  icon,
  inputClassName = '',
  wrapperClassName = '',
  showLocateButton = false,
  locationBias = null,
}) => {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextFetchRef = useRef(false);

  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const debouncedQuery = useDebounce(value.trim(), 220);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!placesLib || !isOpen) return;

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    if (debouncedQuery.length < 2) {
      return;
    }

    let cancelled = false;
    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const request: google.maps.places.AutocompleteRequest = {
      input: debouncedQuery,
      sessionToken: sessionTokenRef.current,
      ...(locationBias ? { locationBias } : {}),
    };

    Promise.resolve().then(() => {
      if (!cancelled) setIsLoading(true);
    });
    AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res.suggestions ?? []);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        reportIfMapsQuotaError(error);
        setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [placesLib, debouncedQuery, isOpen, locationBias]);

  const handleSelectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport'],
      });

      const address =
        place.formattedAddress ||
        place.displayName ||
        suggestion.placePrediction.text.text;

      const location = place.location
        ? { lat: place.location.lat(), lng: place.location.lng() }
        : undefined;

      skipNextFetchRef.current = true;
      onChange(address);
      onPlaceSelect?.({
        address,
        name: place.displayName || undefined,
        location,
        placeId: place.id,
      });
      resetSession();
    } catch (error: unknown) {
      reportIfMapsQuotaError(error);
      const fallbackText = suggestion.placePrediction.text.text;
      skipNextFetchRef.current = true;
      onChange(fallbackText);
      onPlaceSelect?.({ address: fallbackText });
      resetSession();
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        let label = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

        if (placesLib) {
          try {
            const { places } = await placesLib.Place.searchNearby({
              locationRestriction: { center: coords, radius: 150 },
              fields: ['id', 'displayName', 'formattedAddress', 'location'],
              maxResultCount: 1,
            });
            const nearest = places?.[0];
            if (nearest) {
              label =
                nearest.formattedAddress || nearest.displayName || label;
            }
          } catch (error: unknown) {
            reportIfMapsQuotaError(error);
          }
        }

        skipNextFetchRef.current = true;
        onChange(label);
        onPlaceSelect?.({
          address: label,
          location: coords,
        });
        setIsOpen(false);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className={wrapperClassName}>
        {icon}
        <input
          required={required}
          value={value}
          aria-label={ariaLabel}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            if (nextValue.trim().length < 2) {
              setSuggestions([]);
              setIsLoading(false);
            }
            setIsOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={inputClassName}
        />
        {isLoading && (
          <Loader2
            size={15}
            className="shrink-0 animate-spin text-primary"
            aria-hidden="true"
          />
        )}
        {showLocateButton && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            title="Use current location"
            aria-label="Use current location"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition hover:bg-primary/25 disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <LocateFixed size={13} />
            )}
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-[140] mt-2 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-surface p-1.5 shadow-2xl"
        >
          {suggestions.map((suggestion, index) => {
            const prediction = suggestion.placePrediction;
            if (!prediction) return null;
            const mainText =
              prediction.mainText?.text || prediction.text.text;
            const secondaryText = prediction.secondaryText?.text || '';

            return (
              <li key={prediction.placeId || index}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void handleSelectSuggestion(suggestion);
                  }}
                  className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5"
                >
                  <MapPin
                    size={15}
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-on-surface">
                      {mainText}
                    </span>
                    {secondaryText && (
                      <span className="mt-0.5 block truncate text-[10px] text-on-surface-variant">
                        {secondaryText}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = (
  props
) => {
  if (!isGoogleMapsConfigured) {
    return (
      <div className={props.wrapperClassName}>
        {props.icon}
        <input
          required={props.required}
          value={props.value}
          aria-label={props.ariaLabel}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
          className={props.inputClassName}
        />
      </div>
    );
  }

  return <LivePlaceAutocompleteInput {...props} />;
};

export default PlaceAutocompleteInput;
