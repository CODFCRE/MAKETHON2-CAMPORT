import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APILoadingStatus,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Clock3, Navigation } from 'lucide-react';
import {
  GMP_ATTRIBUTION_IDS,
  GMP_MAP_ID,
  isGoogleMapsConfigured,
  reportIfMapsQuotaError,
} from '../../lib/googleMaps';

export interface RouteMetrics {
  distanceText: string;
  durationText: string;
}

interface RouteMapPreviewProps {
  pickup: string;
  destination: string;
  pickupCoords?: google.maps.LatLngLiteral | null;
  destinationCoords?: google.maps.LatLngLiteral | null;
  travelMode?: 'DRIVING' | 'BICYCLING' | 'WALKING';
  interactive?: boolean;
  onRouteComputed?: (metrics: RouteMetrics | null) => void;
  className?: string;
}

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 28.6139, lng: 77.209 };

const PLACEHOLDER_LABELS = new Set([
  '',
  'Set pickup point',
  'Your pickup point',
  'Choose destination',
  'Choose a destination',
  'Store pickup',
  'Pickup counter',
  'Cycle pickup',
  'Local store',
]);

function isRealLocation(label: string, coords?: google.maps.LatLngLiteral | null): boolean {
  if (coords) return true;
  const trimmed = label.trim();
  return trimmed.length > 0 && !PLACEHOLDER_LABELS.has(trimmed);
}

function formatDistance(meters: number | null | undefined): string {
  if (!meters || meters <= 0) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(millis: number | null | undefined): string {
  if (!millis || millis <= 0) return '';
  const mins = Math.max(1, Math.round(millis / 60000));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

interface MarkerWithLabelProps {
  position: google.maps.LatLngLiteral;
  title: string;
  subtitle: string;
  background: string;
  borderColor: string;
  glyphColor: string;
  glyphText: string;
}

const WaypointMarker: React.FC<MarkerWithLabelProps> = ({
  position,
  title,
  subtitle,
  background,
  borderColor,
  glyphColor,
  glyphText,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title={title}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Pin
          background={background}
          borderColor={borderColor}
          glyphColor={glyphColor}
          glyphText={glyphText}
        />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} onCloseClick={handleClose} maxWidth={220}>
          <div className="p-0.5 text-zinc-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {title}
            </p>
            <p className="mt-0.5 text-xs font-bold leading-snug">{subtitle}</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface RouteLayerProps {
  pickup: string;
  destination: string;
  pickupCoords?: google.maps.LatLngLiteral | null;
  destinationCoords?: google.maps.LatLngLiteral | null;
  travelMode: 'DRIVING' | 'BICYCLING' | 'WALKING';
  onMetricsChange: (metrics: RouteMetrics | null, errorMsg: string | null) => void;
}

const RouteLayer: React.FC<RouteLayerProps> = ({
  pickup,
  destination,
  pickupCoords,
  destinationCoords,
  travelMode,
  onMetricsChange,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const placesLib = useMapsLibrary('places');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const [computedOrigin, setComputedOrigin] =
    useState<google.maps.LatLngLiteral | null>(null);
  const [computedDestination, setComputedDestination] =
    useState<google.maps.LatLngLiteral | null>(null);

  const hasOrigin = isRealLocation(pickup, pickupCoords);
  const hasDestination = isRealLocation(destination, destinationCoords);

  const resolvedOrigin = pickupCoords ?? computedOrigin;
  const resolvedDestination = destinationCoords ?? computedDestination;

  // Compute route when both origin and destination are provided
  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!map || !routesLib || !hasOrigin || !hasDestination) {
      return;
    }

    let cancelled = false;
    const originInput: string | google.maps.LatLngLiteral =
      pickupCoords ?? pickup.trim();
    const destinationInput: string | google.maps.LatLngLiteral =
      destinationCoords ?? destination.trim();

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin: originInput,
      destination: destinationInput,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    routesLib.Route.computeRoutes(request)
      .then(({ routes }) => {
        if (cancelled) return;

        if (!routes || routes.length === 0) {
          onMetricsChange(null, 'No route found between these locations.');
          return;
        }

        const primaryRoute = routes[0];
        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: '#F7A873',
            strokeOpacity: 0.95,
            strokeWeight: 5,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        const leg = primaryRoute.legs?.[0];
        const startLoc = leg?.startLocation;
        const endLoc = leg?.endLocation;

        if (!pickupCoords && startLoc) {
          setComputedOrigin({ lat: startLoc.lat, lng: startLoc.lng });
        }

        if (!destinationCoords && endLoc) {
          setComputedDestination({ lat: endLoc.lat, lng: endLoc.lng });
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 44);
        }

        const distanceText = formatDistance(primaryRoute.distanceMeters);
        const durationText = formatDuration(primaryRoute.durationMillis);
        if (distanceText || durationText) {
          onMetricsChange({ distanceText, durationText }, null);
        } else {
          onMetricsChange(null, null);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        reportIfMapsQuotaError(error);
        console.warn('Route calculation unavailable:', error);
        onMetricsChange(null, 'Unable to load route data right now.');
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [
    map,
    routesLib,
    hasOrigin,
    hasDestination,
    pickup,
    destination,
    pickupCoords,
    destinationCoords,
    travelMode,
    onMetricsChange,
  ]);

  // Single-location centering when only pickup OR only destination is provided
  useEffect(() => {
    if (!map || (hasOrigin && hasDestination)) return;

    const singleCoords = pickupCoords ?? destinationCoords;
    if (singleCoords) {
      map.panTo(singleCoords);
      map.setZoom(14);
      return;
    }

    const singleLabel = hasOrigin
      ? pickup.trim()
      : hasDestination
        ? destination.trim()
        : '';
    if (!singleLabel || !placesLib) return;

    let cancelled = false;
    placesLib.Place.searchByText({
      textQuery: singleLabel,
      fields: ['location', 'viewport'],
      maxResultCount: 1,
    })
      .then(({ places }) => {
        if (cancelled) return;
        const place = places?.[0];
        if (!place) return;
        if (place.viewport) {
          map.fitBounds(place.viewport);
        } else if (place.location) {
          map.panTo({
            lat: place.location.lat(),
            lng: place.location.lng(),
          });
          map.setZoom(14);
        }
        if (place.location) {
          const coords = {
            lat: place.location.lat(),
            lng: place.location.lng(),
          };
          if (hasOrigin) setComputedOrigin(coords);
          else setComputedDestination(coords);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) reportIfMapsQuotaError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    map,
    placesLib,
    hasOrigin,
    hasDestination,
    pickup,
    destination,
    pickupCoords,
    destinationCoords,
  ]);

  return (
    <>
      {resolvedOrigin && hasOrigin && (
        <WaypointMarker
          position={resolvedOrigin}
          title="Pickup"
          subtitle={pickup}
          background="#34C759"
          borderColor="#14532D"
          glyphColor="#FFFFFF"
          glyphText="A"
        />
      )}
      {resolvedDestination && hasDestination && (
        <WaypointMarker
          position={resolvedDestination}
          title="Destination"
          subtitle={destination}
          background="#F7A873"
          borderColor="#7C2D12"
          glyphColor="#191715"
          glyphText="B"
        />
      )}
    </>
  );
};

const IllustrativeRouteFallback: React.FC<{
  pickup: string;
  destination: string;
  className?: string;
}> = ({ pickup, destination, className = '' }) => (
  <div
    role="img"
    aria-label={`Illustrative route from ${pickup} to ${destination}`}
    className={`route-map-preview relative overflow-hidden ${className}`}
  >
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <path
        d="M-20 42 345 132M-18 146 336 28M42-20 108 202M232-22 176 204M294-18 250 205"
        className="route-map-road"
      />
      <path
        d="M-18 97C35 97 38 56 93 56s57 75 113 75 50-47 132-47"
        className="route-map-road route-map-road-wide"
      />
      <path
        d="M34 157C76 130 84 78 129 77s44 48 82 48 43-34 75-44"
        className="route-map-line"
      />
      <circle cx="34" cy="157" r="7" className="route-map-origin" />
      <circle cx="286" cy="81" r="7" className="route-map-destination" />
    </svg>
    <div className="absolute left-3 top-3 max-w-[46%] rounded-xl bg-surface px-3 py-2 shadow-md">
      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
        Pickup
      </p>
      <p className="truncate text-xs font-bold text-on-surface">
        {pickup || 'Set pickup point'}
      </p>
    </div>
    <div className="absolute bottom-3 right-3 max-w-[46%] rounded-xl bg-surface px-3 py-2 text-right shadow-md">
      <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
        Destination
      </p>
      <p className="truncate text-xs font-bold text-on-surface">
        {destination || 'Choose destination'}
      </p>
    </div>
  </div>
);

const LiveRouteMap: React.FC<RouteMapPreviewProps> = ({
  pickup,
  destination,
  pickupCoords,
  destinationCoords,
  travelMode = 'DRIVING',
  interactive = true,
  onRouteComputed,
  className = '',
}) => {
  const apiStatus = useApiLoadingStatus();
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const handleMetricsChange = useCallback(
    (nextMetrics: RouteMetrics | null, errorMsg: string | null) => {
      setMetrics(nextMetrics);
      setRouteError(errorMsg);
      onRouteComputed?.(nextMetrics);
    },
    [onRouteComputed]
  );

  const initialCenter = useMemo(
    () => pickupCoords ?? destinationCoords ?? DEFAULT_CENTER,
    [pickupCoords, destinationCoords]
  );

  if (
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <IllustrativeRouteFallback
        pickup={pickup}
        destination={destination}
        className={className}
      />
    );
  }

  return (
    <div
      className={`route-map-preview relative min-h-[144px] w-full overflow-hidden ${className}`}
    >
      <GoogleMap
        mapId={GMP_MAP_ID}
        internalUsageAttributionIds={GMP_ATTRIBUTION_IDS}
        defaultCenter={initialCenter}
        defaultZoom={13}
        gestureHandling={interactive ? 'greedy' : 'cooperative'}
        disableDefaultUI={!interactive}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <RouteLayer
          pickup={pickup}
          destination={destination}
          pickupCoords={pickupCoords}
          destinationCoords={destinationCoords}
          travelMode={travelMode}
          onMetricsChange={handleMetricsChange}
        />
      </GoogleMap>

      {metrics && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-surface/95 px-3 py-1.5 text-[11px] font-extrabold text-on-surface shadow-lg backdrop-blur-md">
          <Navigation size={12} className="text-primary" />
          <span>{metrics.distanceText}</span>
          {metrics.durationText && (
            <>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1 text-primary">
                <Clock3 size={11} /> {metrics.durationText}
              </span>
            </>
          )}
        </div>
      )}

      {routeError && !metrics && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-xl bg-surface/95 px-3 py-1.5 text-[10px] font-semibold text-on-surface-variant shadow-md backdrop-blur-md">
          {routeError}
        </div>
      )}
    </div>
  );
};

const RouteMapPreview: React.FC<RouteMapPreviewProps> = (props) => {
  if (!isGoogleMapsConfigured) {
    return (
      <IllustrativeRouteFallback
        pickup={props.pickup}
        destination={props.destination}
        className={props.className}
      />
    );
  }

  return <LiveRouteMap {...props} />;
};

export default RouteMapPreview;
