import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, MapPin, Minus, Plus, Star, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Booking, LatLngPoint, MarketplaceService } from '../../types/booking';
import { saveBooking } from '../../utils/bookings';
import RouteMapPreview, { type RouteMetrics } from '../common/RouteMapPreview';
import PlaceAutocompleteInput from '../maps/PlaceAutocompleteInput';
import type { SelectedPlaceValue } from '../../lib/googleMaps';

interface BookingDialogProps {
  service: MarketplaceService;
  defaultPickup?: string;
  defaultPickupCoords?: LatLngPoint | null;
  defaultDestination?: string;
  defaultDestinationCoords?: LatLngPoint | null;
  onClose: () => void;
  onBooked: () => void;
}

const BookingDialog: React.FC<BookingDialogProps> = ({
  service,
  defaultPickup = '',
  defaultPickupCoords = null,
  defaultDestination = '',
  defaultDestinationCoords = null,
  onClose,
  onBooked,
}) => {
  const [pickup, setPickup] = useState(defaultPickup);
  const [pickupCoords, setPickupCoords] = useState<LatLngPoint | null>(defaultPickupCoords);
  const [destination, setDestination] = useState(defaultDestination);
  const [destinationCoords, setDestinationCoords] = useState<LatLngPoint | null>(defaultDestinationCoords);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const isRide = service.type === 'ride';
  const isRental = service.type === 'rent';

  const handlePickupPlace = useCallback((place: SelectedPlaceValue) => {
    setPickup(place.address);
    setPickupCoords(place.location ?? null);
  }, []);

  const handleDestinationPlace = useCallback((place: SelectedPlaceValue) => {
    setDestination(place.address);
    setDestinationCoords(place.location ?? null);
  }, []);

  const handleRouteComputed = useCallback((metrics: RouteMetrics | null) => {
    setRouteMetrics(metrics);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const booking: Booking = {
      id: crypto.randomUUID(),
      serviceId: service.id,
      serviceName: service.name,
      type: service.type,
      amount: service.price * quantity,
      quantity,
      pickup: isRide || isRental ? pickup.trim() : fulfillment === 'delivery' ? pickup.trim() : 'Store pickup',
      destination: isRide ? destination.trim() : '',
      ...(pickupCoords ? { pickupCoords } : {}),
      ...(isRide && destinationCoords ? { destinationCoords } : {}),
      ...(isRide && routeMetrics?.distanceText ? { distanceText: routeMetrics.distanceText } : {}),
      ...(isRide && routeMetrics?.durationText ? { durationText: routeMetrics.durationText } : {}),
      fulfillment: isRide ? 'ride' : isRental ? 'rental' : fulfillment,
      status: 'Requested',
      createdAt: new Date().toISOString(),
    };

    try {
      saveBooking(booking);
      toast.success(isRide ? 'Ride request placed' : isRental ? 'Cycle rental request placed' : 'Snack order placed');
      onBooked();
    } catch (error) {
      console.error('Unable to save booking:', error);
      toast.error('Could not save your request. Please try again.');
    }
  };

  return createPortal((
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-white/10 bg-surface p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {isRide ? 'Ride booking' : isRental ? 'Cycle rental' : 'Snack order'}
            </p>
            <h2 id="booking-title" className="mt-1 text-2xl font-black tracking-tight text-white">{service.name}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full bg-white/5 p-2 text-on-surface-variant hover:text-white">
            <X size={18} />
          </button>
        </div>

        {(isRide || isRental) && (
          <div className="mb-5">
            <RouteMapPreview
              pickup={pickup || 'Set pickup point'}
              destination={isRide ? (destination || 'Choose destination') : ''}
              pickupCoords={pickupCoords}
              destinationCoords={isRide ? destinationCoords : null}
              travelMode={isRental ? 'BICYCLING' : 'DRIVING'}
              onRouteComputed={handleRouteComputed}
              className="h-44 rounded-2xl"
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRide && (
            <div className="ios-card flex items-center gap-3 p-3">
              <img src={service.image} alt="" className="h-14 w-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary">Choose a ride</p>
                <p className="mt-1 truncate text-sm font-extrabold text-on-surface">{service.category}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-on-surface-variant">
                  <Star size={11} className="fill-primary text-primary" /> {service.rating} · {routeMetrics?.durationText || `${service.eta} pickup`}
                </p>
              </div>
              <span className="text-sm font-black text-on-surface">₹{service.price}</span>
            </div>
          )}

          {isRide && (
            <>
              <div className="block">
                <span className="mb-2 block text-xs font-bold text-on-surface-variant">Pickup point</span>
                <PlaceAutocompleteInput
                  required
                  value={pickup}
                  onChange={(next) => {
                    setPickup(next);
                    setPickupCoords(null);
                  }}
                  onPlaceSelect={handlePickupPlace}
                  placeholder="Enter your pickup location"
                  ariaLabel="Pickup point"
                  showLocateButton
                  icon={<MapPin size={16} className="shrink-0 text-success" />}
                  wrapperClassName="booking-field flex items-center gap-3 rounded-2xl border border-white/10 px-4"
                  inputClassName="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                />
              </div>
              <div className="block">
                <span className="mb-2 block text-xs font-bold text-on-surface-variant">Drop-off point</span>
                <PlaceAutocompleteInput
                  required
                  value={destination}
                  onChange={(next) => {
                    setDestination(next);
                    setDestinationCoords(null);
                  }}
                  onPlaceSelect={handleDestinationPlace}
                  placeholder="Where are you going?"
                  ariaLabel="Drop-off point"
                  locationBias={pickupCoords}
                  icon={<MapPin size={16} className="shrink-0 text-error" />}
                  wrapperClassName="booking-field flex items-center gap-3 rounded-2xl border border-white/10 px-4"
                  inputClassName="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                />
              </div>
            </>
          )}

          {isRental && (
            <div className="block">
              <span className="mb-2 block text-xs font-bold text-on-surface-variant">Pickup location</span>
              <PlaceAutocompleteInput
                required
                value={pickup}
                onChange={(next) => {
                  setPickup(next);
                  setPickupCoords(null);
                }}
                onPlaceSelect={handlePickupPlace}
                placeholder="Where will you collect the cycle?"
                ariaLabel="Pickup location"
                showLocateButton
                icon={<MapPin size={16} className="shrink-0 text-success" />}
                wrapperClassName="booking-field flex items-center gap-3 rounded-2xl border border-white/10 px-4"
                inputClassName="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
          )}

          {service.type === 'snack' && (
            <>
              <div className="booking-field rounded-2xl p-1">
                {(['delivery', 'pickup'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFulfillment(option)}
                    className={`w-1/2 rounded-xl py-3 text-xs font-bold capitalize transition ${fulfillment === option ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
                  >
                    {option === 'delivery' ? 'Deliver to me' : 'I’ll pick it up'}
                  </button>
                ))}
              </div>
              {fulfillment === 'delivery' && (
                <div className="block">
                  <span className="mb-2 block text-xs font-bold text-on-surface-variant">Delivery address</span>
                  <PlaceAutocompleteInput
                    required
                    value={pickup}
                    onChange={(next) => {
                      setPickup(next);
                      setPickupCoords(null);
                    }}
                    onPlaceSelect={handlePickupPlace}
                    placeholder="Enter your address"
                    ariaLabel="Delivery address"
                    showLocateButton
                    icon={<MapPin size={16} className="shrink-0 text-primary" />}
                    wrapperClassName="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4"
                    inputClassName="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                </div>
              )}
            </>
          )}

          {!isRide && (
            <div className="booking-field flex items-center justify-between rounded-2xl border border-white/5 p-4">
              <div>
                <p className="text-sm font-bold text-white">{isRental ? 'Rental duration' : 'Quantity'}</p>
                <p className="text-xs text-on-surface-variant">₹{service.price} {isRental ? service.priceUnit : 'each'}</p>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" aria-label={isRental ? 'Decrease rental hours' : 'Decrease quantity'} disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)} className="rounded-full bg-white/5 p-2 text-white disabled:opacity-30"><Minus size={14} /></button>
                <span className="text-center text-sm font-black text-white">{quantity}{isRental ? ` ${quantity === 1 ? 'hour' : 'hours'}` : ''}</span>
                <button type="button" aria-label={isRental ? 'Increase rental hours' : 'Increase quantity'} onClick={() => setQuantity((value) => value + 1)} className="rounded-full bg-white/5 p-2 text-white"><Plus size={14} /></button>
              </div>
            </div>
          )}

          {isRide && (
            <div className="booking-field flex items-center gap-3 rounded-2xl p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CreditCard size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-on-surface">Payment method</span>
                <span className="mt-0.5 block text-[10px] text-on-surface-variant">
                  {routeMetrics?.distanceText ? `${routeMetrics.distanceText} · ` : ''}Cash · demo booking
                </span>
              </span>
              <span className="text-[10px] font-bold text-primary">Selected</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Estimated total</p>
              <p className="text-2xl font-black text-white">₹{service.price * quantity}</p>
            </div>
            <button type="submit" className="rounded-full bg-primary px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-primary/20 active:scale-95">
              {isRide ? 'Find a ride' : isRental ? 'Request rental' : 'Place order'}
            </button>
          </div>
          <p className="text-center text-[10px] leading-4 text-on-surface-variant">
            Demo request only. No local rental partner, driver, store, or payment provider is connected yet.
          </p>
        </form>
      </section>
    </div>
  ), document.body);
};

export default BookingDialog;
