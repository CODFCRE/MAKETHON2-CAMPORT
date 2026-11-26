import React, { useState } from 'react';
import {
  ArrowRight, Bell, Bike, CarFront, ChevronDown, Clock3, MapPin, PackageCheck,
  Search, Sandwich, Star, UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BookingDialog from '../components/booking/BookingDialog';
import NeighborhoodExplorerMap from '../components/maps/NeighborhoodExplorerMap';
import PlaceAutocompleteInput from '../components/maps/PlaceAutocompleteInput';
import { services } from '../data/marketplace';
import type { SelectedPlaceValue } from '../lib/googleMaps';
import type { LatLngPoint, MarketplaceService } from '../types/booking';

const serviceCategories = [
  { id: 'ride', title: 'Book a ride', subtitle: 'E-rickshaw nearby', icon: CarFront, type: 'ride' },
  { id: 'rent', title: 'Rent a cycle', subtitle: 'From ₹40 / hour', icon: Bike, type: 'rent' },
  { id: 'food', title: 'Order food', subtitle: 'Snacks and chai', icon: Sandwich, type: 'snack' },
  { id: 'delivery', title: 'Send a parcel', subtitle: 'Local delivery', icon: PackageCheck, type: 'snack' },
] as const;

const recentPlaces = [
  { name: 'Central Market', detail: 'Main entrance' },
  { name: 'Railway Station', detail: 'North gate' },
];

const Home: React.FC = () => {
  const [destination, setDestination] = useState('');
  const [pickupPlace, setPickupPlace] = useState<SelectedPlaceValue | null>(null);
  const [selectedService, setSelectedService] = useState<MarketplaceService | null>(null);
  const [bookingDestination, setBookingDestination] = useState('');
  const [bookingDestinationCoords, setBookingDestinationCoords] = useState<LatLngPoint | null>(null);
  const navigate = useNavigate();

  const openRideBooking = (dropoff = '', dropoffCoords: LatLngPoint | null = null) => {
    const ride = services.find((service) => service.id === 'electric-rickshaw');
    if (ride) {
      setBookingDestination(dropoff);
      setBookingDestinationCoords(dropoffCoords);
      setSelectedService(ride);
    }
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = destination.trim();
    navigate(`/services?type=ride${search ? `&destination=${encodeURIComponent(search)}` : ''}`);
  };

  const handleSearchPlaceSelect = (place: SelectedPlaceValue) => {
    setDestination(place.address);
    openRideBooking(place.address, place.location ?? null);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-5 text-on-surface lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-8">
      <header className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => openRideBooking()}
            className="flex min-w-0 items-center gap-2.5 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MapPin size={19} />
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Pickup location</span>
              <span className="flex items-center gap-1 truncate text-sm font-extrabold text-on-surface">
                <span className="truncate">{pickupPlace?.address || 'Choose your pickup'}</span> <ChevronDown size={14} className="shrink-0" />
              </span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface text-on-surface-variant transition hover:text-primary"
            >
              <Bell size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label="Open profile"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary text-[#191715]"
            >
              <UserRound size={19} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-5">
          <div className="ios-card flex h-12 items-center gap-3 px-4">
            <PlaceAutocompleteInput
              value={destination}
              onChange={setDestination}
              onPlaceSelect={handleSearchPlaceSelect}
              placeholder="Where do you want to go?"
              ariaLabel="Ride destination"
              locationBias={pickupPlace?.location ?? null}
              icon={<Search size={18} className="shrink-0 text-on-surface-variant" />}
              wrapperClassName="flex flex-1 items-center gap-3"
              inputClassName="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant"
            />
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
              <Clock3 size={12} /> Now
            </span>
          </div>
        </form>
      </header>

      <section className="relative overflow-hidden rounded-[26px] bg-primary px-5 py-5 text-[#191715] shadow-sm lg:px-8 lg:py-7">
        <div className="relative z-10 max-w-[72%]">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/55">Camport · rides, rentals & bites</p>
          <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight lg:text-4xl">Your neighborhood,<br />one tap away.</h1>
          <p className="mt-2 max-w-sm text-xs font-medium text-black/65 lg:text-sm">Book a local ride, rent a cycle, or get your favorites delivered.</p>
          <button
            type="button"
            onClick={() => navigate('/services')}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#191715] px-4 py-2.5 text-xs font-extrabold text-primary transition hover:opacity-90"
          >
            Explore services <ArrowRight size={14} />
          </button>
        </div>
        <div className="pointer-events-none absolute -right-3 -top-5 h-44 w-44 rounded-full border border-black/10 lg:right-10 lg:top-1 lg:h-56 lg:w-56">
          <div className="absolute inset-5 rounded-full border border-black/10" />
          <div className="absolute inset-10 rounded-full border border-black/10" />
          <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <path d="M22 92C42 90 40 56 60 59s19 23 38 18" fill="none" stroke="#191715" strokeDasharray="3 5" strokeLinecap="round" strokeWidth="2" />
            <circle cx="22" cy="92" r="6" fill="#191715" />
            <circle cx="98" cy="77" r="6" fill="#fffaf6" stroke="#191715" strokeWidth="2" />
          </svg>
        </div>
      </section>

      <div className="mt-7">
        <NeighborhoodExplorerMap
          pickupPlace={pickupPlace}
          onPickupLocated={setPickupPlace}
          onSelectDestination={(place) =>
            openRideBooking(place.address, place.location ?? null)
          }
        />
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black tracking-tight">Services</h2>
                <p className="mt-0.5 text-[11px] text-on-surface-variant">What can we help with?</p>
              </div>
              <button onClick={() => navigate('/services')} className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {serviceCategories.map(({ id, title, subtitle, icon: Icon, type }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => navigate(`/services?type=${type}&category=${id}`)}
                  className="ios-card group flex min-h-[82px] items-center gap-3 p-3 text-left transition active:scale-[0.98] hover:border-primary/30"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold text-on-surface">{title}</span>
                    <span className="mt-1 block truncate text-[10px] text-on-surface-variant">{subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black tracking-tight">Recent places</h2>
                <p className="mt-0.5 text-[11px] text-on-surface-variant">Quickly set a ride destination</p>
              </div>
            </div>
            <div className="ios-card divide-y divide-white/5 overflow-hidden px-4">
              {recentPlaces.map((place) => (
                <button
                  type="button"
                  key={place.name}
                  onClick={() => openRideBooking(place.name)}
                  className="ios-list-item w-full gap-3 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-on-surface">{place.name}</span>
                    <span className="mt-0.5 block text-[10px] text-on-surface-variant">{place.detail}</span>
                  </span>
                  <ArrowRight size={15} className="text-on-surface-variant" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight">Popular near you</h2>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">Local picks to get you started</p>
            </div>
            <button onClick={() => navigate('/services')} className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              See all <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {services.map((service) => (
              <button
                type="button"
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="ios-card overflow-hidden text-left transition active:scale-[0.98]"
              >
                <div className="media-overlay relative h-28 overflow-hidden">
                  <img src={service.image} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-1 text-[9px] font-bold text-white">
                    {service.category}
                  </span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-xs font-extrabold text-on-surface">{service.name}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-on-surface">₹{service.price}<span className="ml-1 font-medium text-on-surface-variant">{service.priceUnit}</span></span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
                      <Star size={11} className="fill-primary text-primary" /> {service.rating}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selectedService && (
        <BookingDialog
          service={selectedService}
          defaultPickup={pickupPlace?.address ?? ''}
          defaultPickupCoords={pickupPlace?.location ?? null}
          defaultDestination={bookingDestination}
          defaultDestinationCoords={bookingDestinationCoords}
          onClose={() => setSelectedService(null)}
          onBooked={() => {
            setSelectedService(null);
            navigate('/orders');
          }}
        />
      )}
    </div>
  );
};

export default Home;
