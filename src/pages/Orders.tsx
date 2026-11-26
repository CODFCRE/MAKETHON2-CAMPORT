import React, { useState } from 'react';
import { ArrowRight, Bike, CarFront, Clock3, PackageCheck, Sandwich } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RouteMapPreview from '../components/common/RouteMapPreview';
import type { Booking, ServiceType } from '../types/booking';
import { getBookings } from '../utils/bookings';

const serviceShortcuts: { label: string; type: ServiceType; icon: typeof CarFront }[] = [
  { label: 'Book a ride', type: 'ride', icon: CarFront },
  { label: 'Rent a cycle', type: 'rent', icon: Bike },
  { label: 'Order food', type: 'snack', icon: Sandwich },
];

const getBookingDestination = (booking: Booking | undefined) => {
  if (!booking) return 'Choose a destination';
  if (booking.type === 'ride') return booking.destination || 'Choose a destination';
  if (booking.type === 'rent') return 'Cycle pickup';
  return booking.fulfillment === 'delivery' ? 'Local store' : 'Pickup counter';
};

const getBookingSubtitle = (booking: Booking) => {
  if (booking.type === 'ride') return `${booking.pickup || 'Pickup point'} → ${booking.destination || 'Destination'}`;
  if (booking.type === 'rent') return `${booking.quantity} ${booking.quantity === 1 ? 'hour' : 'hours'} · ${booking.pickup}`;
  return `${booking.fulfillment === 'delivery' ? 'Delivery' : 'Store pickup'} · ${booking.pickup}`;
};

const getBookingIcon = (booking: Booking) => {
  if (booking.type === 'ride') return CarFront;
  if (booking.type === 'rent') return Bike;
  return booking.fulfillment === 'delivery' ? PackageCheck : Sandwich;
};

const Orders: React.FC = () => {
  const [{ bookings, loadError }] = useState(() => {
    try {
      return { bookings: getBookings(), loadError: '' };
    } catch (error) {
      console.error('Unable to load saved bookings:', error);
      return { bookings: [] as Booking[], loadError: 'Could not load saved requests from this device.' };
    }
  });
  const navigate = useNavigate();
  const latestBooking = bookings[0];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-5 text-on-surface lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Your Camport</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight lg:text-4xl">Activity</h1>
          <p className="mt-1 text-xs text-on-surface-variant lg:text-sm">Track requests and revisit your recent orders.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/services')}
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-label="Browse services"
        >
          <ArrowRight size={18} />
        </button>
      </header>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <div className="space-y-7">
          <section className="ios-card overflow-hidden">
            <RouteMapPreview
              pickup={latestBooking?.pickup || 'Your pickup point'}
              destination={getBookingDestination(latestBooking)}
              pickupCoords={latestBooking?.pickupCoords ?? null}
              destinationCoords={latestBooking?.destinationCoords ?? null}
              travelMode={latestBooking?.type === 'rent' ? 'BICYCLING' : 'DRIVING'}
              className="h-52 rounded-none lg:h-64"
            />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                  {latestBooking ? 'Latest request' : 'Ready when you are'}
                </p>
                {latestBooking && (
                  <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-extrabold text-primary">
                    Request sent
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-lg font-black text-on-surface">
                {latestBooking ? latestBooking.serviceName : 'Your next trip starts here'}
              </h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                {latestBooking ? getBookingSubtitle(latestBooking) : 'Book a local ride, rent a cycle, or order something nearby.'}
              </p>
              {latestBooking && (latestBooking.distanceText || latestBooking.durationText) && (
                <p className="mt-1.5 text-[11px] font-bold text-primary">
                  {[latestBooking.distanceText, latestBooking.durationText].filter(Boolean).join(' · ')}
                </p>
              )}

              {latestBooking ? (
                <div className="mt-5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                    <div className="h-full w-1/4 rounded-full bg-primary" />
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-on-surface-variant">
                    Saved on this device. Live partner tracking is not connected yet.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/services')}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-[#191715]"
                >
                  Explore services <ArrowRight size={14} />
                </button>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-base font-black">Services</h2>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">Get moving or order again</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {serviceShortcuts.map(({ label, type, icon: Icon }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => navigate(`/services?type=${type}`)}
                  className="ios-card flex min-h-[82px] flex-col items-start justify-between p-3 text-left transition hover:border-primary/30"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon size={16} />
                  </span>
                  <span className="text-[10px] font-extrabold text-on-surface">{label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-base font-black">Recent activity</h2>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">Your requests on this device</p>
            </div>
            {bookings.length > 0 && <span className="text-[10px] font-bold text-on-surface-variant">{bookings.length} total</span>}
          </div>

          {loadError ? (
            <div role="alert" className="rounded-2xl border border-error/20 bg-error/10 px-4 py-4 text-sm text-error">
              {loadError}
            </div>
          ) : bookings.length > 0 ? (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const Icon = getBookingIcon(booking);
                return (
                  <article key={booking.id} className="ios-card flex items-center gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-on-surface">{booking.serviceName}</p>
                      <p className="mt-1 truncate text-[10px] text-on-surface-variant">{getBookingSubtitle(booking)}</p>
                      <p className="mt-1 text-[9px] font-semibold text-on-surface-variant">
                        {new Date(booking.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-black text-on-surface">₹{booking.amount}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-primary">
                        <Clock3 size={10} /> {booking.status}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="ios-card p-5">
              <p className="text-sm font-extrabold text-on-surface">No requests yet</p>
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">Your rides, rentals and food orders will show up here.</p>
              <button
                type="button"
                onClick={() => navigate('/services')}
                className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-primary"
              >
                Browse services <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Orders;
