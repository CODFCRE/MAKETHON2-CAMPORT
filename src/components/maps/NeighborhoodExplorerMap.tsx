import React, { useCallback, useEffect, useState } from 'react';
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
import { ArrowRight, Compass, Loader2, LocateFixed, Star } from 'lucide-react';
import {
  GMP_ATTRIBUTION_IDS,
  GMP_MAP_ID,
  isGoogleMapsConfigured,
  reportIfMapsQuotaError,
  type SelectedPlaceValue,
} from '../../lib/googleMaps';

interface NeighborhoodExplorerMapProps {
  pickupPlace?: SelectedPlaceValue | null;
  onSelectDestination: (place: SelectedPlaceValue) => void;
  onPickupLocated?: (place: SelectedPlaceValue) => void;
}

interface NearbyPlaceItem {
  id: string;
  name: string;
  address: string;
  location: google.maps.LatLngLiteral;
  rating?: number | null;
}

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 28.6139, lng: 77.209 };

const EXPLORE_CATEGORIES = [
  { id: 'transit', label: 'Transit hubs', types: ['transit_station', 'train_station', 'bus_station'] },
  { id: 'food', label: 'Cafes & Chai', types: ['cafe', 'restaurant'] },
  { id: 'parks', label: 'Parks & Spots', types: ['park', 'shopping_mall'] },
] as const;

const PlaceMarkerWithInfo: React.FC<{
  place: NearbyPlaceItem;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
  onBookRide: (place: SelectedPlaceValue) => void;
}> = ({ place, isSelected, onSelect, onClose, onBookRide }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.location}
        title={place.name}
        onClick={onSelect}
      >
        <Pin
          background="#F7A873"
          borderColor="#7C2D12"
          glyphColor="#191715"
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={240}>
          <div className="p-0.5 text-zinc-900">
            <p className="text-xs font-extrabold leading-snug">{place.name}</p>
            {place.address && (
              <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-600">
                {place.address}
              </p>
            )}
            {typeof place.rating === 'number' && (
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                <Star size={10} className="fill-amber-500 text-amber-500" />
                {place.rating.toFixed(1)}
              </p>
            )}
            <button
              type="button"
              onClick={() =>
                onBookRide({
                  address: place.address || place.name,
                  name: place.name,
                  location: place.location,
                  placeId: place.id,
                })
              }
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#191715] px-2.5 py-1.5 text-[10px] font-extrabold text-[#F7A873]"
            >
              Ride here <ArrowRight size={11} />
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const ExplorerMapContent: React.FC<{
  center: google.maps.LatLngLiteral;
  pickupPlace?: SelectedPlaceValue | null;
  categoryTypes: readonly string[];
  onSelectDestination: (place: SelectedPlaceValue) => void;
  onPlacesLoaded: (count: number, loading: boolean) => void;
}> = ({
  center,
  pickupPlace,
  categoryTypes,
  onSelectDestination,
  onPlacesLoaded,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [map, center]);

  useEffect(() => {
    if (!placesLib) return;
    let cancelled = false;

    onPlacesLoaded(0, true);
    placesLib.Place.searchNearby({
      locationRestriction: { center, radius: 2200 },
      includedPrimaryTypes: [...categoryTypes],
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating'],
      maxResultCount: 8,
    })
      .then(({ places }) => {
        if (cancelled) return;
        const mapped: NearbyPlaceItem[] = (places ?? [])
          .filter((place) => Boolean(place.location))
          .map((place) => ({
            id: place.id,
            name: place.displayName || 'Local spot',
            address: place.formattedAddress || '',
            location: {
              lat: place.location!.lat(),
              lng: place.location!.lng(),
            },
            rating: place.rating,
          }));
        setNearbyPlaces(mapped);
        setSelectedId(null);
        onPlacesLoaded(mapped.length, false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        reportIfMapsQuotaError(error);
        setNearbyPlaces([]);
        onPlacesLoaded(0, false);
      });

    return () => {
      cancelled = true;
    };
  }, [placesLib, center, categoryTypes, onPlacesLoaded]);

  return (
    <>
      {pickupPlace?.location && (
        <AdvancedMarker
          position={pickupPlace.location}
          title={pickupPlace.address || 'Pickup'}
        >
          <Pin
            background="#34C759"
            borderColor="#14532D"
            glyphColor="#FFFFFF"
            glyphText="P"
          />
        </AdvancedMarker>
      )}

      {nearbyPlaces.map((place) => (
        <PlaceMarkerWithInfo
          key={place.id}
          place={place}
          isSelected={selectedId === place.id}
          onSelect={() => setSelectedId(place.id)}
          onClose={() => setSelectedId(null)}
          onBookRide={onSelectDestination}
        />
      ))}
    </>
  );
};

const LiveNeighborhoodExplorerMap: React.FC<NeighborhoodExplorerMapProps> = ({
  pickupPlace,
  onSelectDestination,
  onPickupLocated,
}) => {
  const apiStatus = useApiLoadingStatus();
  const [activeCategory, setActiveCategory] = useState<
    (typeof EXPLORE_CATEGORIES)[number]['id']
  >('transit');
  const [manualCenter, setManualCenter] =
    useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const center = pickupPlace?.location ?? manualCenter;
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesCount, setPlacesCount] = useState(0);

  const handlePlacesLoaded = useCallback((count: number, loading: boolean) => {
    setPlacesCount(count);
    setIsLoadingPlaces(loading);
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setManualCenter(coords);
        onPickupLocated?.({
          address: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
          location: coords,
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const currentCategory =
    EXPLORE_CATEGORIES.find((c) => c.id === activeCategory) ??
    EXPLORE_CATEGORIES[0];

  if (
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE
  ) {
    return null;
  }

  return (
    <section className="ios-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Compass size={15} />
          </span>
          <div>
            <h2 className="text-sm font-black tracking-tight text-on-surface">
              Nearby on Google Maps
            </h2>
            <p className="text-[10px] text-on-surface-variant">
              {isLoadingPlaces
                ? 'Finding nearby places...'
                : `${placesCount} places nearby · tap a pin to book`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary/20 disabled:opacity-50"
        >
          {isLocating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <LocateFixed size={12} />
          )}
          Locate me
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar">
        {EXPLORE_CATEGORIES.map((category) => (
          <button
            type="button"
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
              activeCategory === category.id
                ? 'bg-primary text-[#191715]'
                : 'bg-white/5 text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="relative h-64 w-full lg:h-72">
        <GoogleMap
          mapId={GMP_MAP_ID}
          internalUsageAttributionIds={GMP_ATTRIBUTION_IDS}
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="greedy"
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <ExplorerMapContent
            center={center}
            pickupPlace={pickupPlace}
            categoryTypes={currentCategory.types}
            onSelectDestination={onSelectDestination}
            onPlacesLoaded={handlePlacesLoaded}
          />
        </GoogleMap>
      </div>
    </section>
  );
};

export const NeighborhoodExplorerMap: React.FC<NeighborhoodExplorerMapProps> = (
  props
) => {
  if (!isGoogleMapsConfigured) {
    return null;
  }

  return <LiveNeighborhoodExplorerMap {...props} />;
};

export default NeighborhoodExplorerMap;
