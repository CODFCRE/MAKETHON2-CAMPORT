import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bike, Clock3, PackageCheck, Sandwich } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Booking, ServiceType } from '../types/booking';
import { earnService } from '../features/earn/earnService';
import { marketplaceService } from '../features/marketplace/marketplaceService';
import { useUserStore } from '../store/useUserStore';

const serviceShortcuts: { label: string; type: ServiceType; icon: typeof Bike }[] = [
  { label: 'Rent a cycle', type: 'rent', icon: Bike },
  { label: 'Order snacks', type: 'snack', icon: Sandwich },
];

const getBookingSubtitle = (booking: Booking) => {
  if (booking.type === 'rent') {
    return `${booking.quantity} ${booking.quantity === 1 ? 'hour' : 'hours'} · ${booking.pickup}`;
  }
  return `${booking.fulfillment === 'delivery' ? 'Delivery' : 'Store pickup'} · ${booking.pickup}`;
};

const getBookingIcon = (booking: Booking) => {
  if (booking.type === 'rent') return Bike;
  return booking.fulfillment === 'delivery' ? PackageCheck : Sandwich;
};

const Orders: React.FC = () => {
  const { user } = useUserStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    if (!user) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([
      earnService.getCycleRentalBookings(user.id),
      marketplaceService.getFoodOrderBookings(user.id),
    ])
      .then(([rentals, foodOrders]) => {
        if (active) {
          setBookings([...rentals, ...foodOrders].sort(
            (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
          ));
          setLoadError('');
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to load marketplace activity:', error);
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Could not load your activity.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const latestBooking = useMemo(() => bookings[0], [bookings]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-5 text-on-surface lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Your Camport</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight lg:text-4xl">Activity</h1>
          <p className="mt-1 text-xs text-on-surface-variant lg:text-sm">Your Supabase-backed rental and food orders.</p>
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

      {loadError && (
        <div role="alert" className="mb-4 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-xs text-error">
          {loadError}
        </div>
      )}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <div className="space-y-7">
          <section className="ios-card p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
              {latestBooking ? 'Latest request' : 'Ready when you are'}
            </p>
            <h2 className="mt-2 text-lg font-black text-on-surface">
              {latestBooking?.serviceName ?? 'Explore current services'}
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              {latestBooking
                ? getBookingSubtitle(latestBooking)
                : 'Cycle rentals and food listings are loaded from Supabase.'}
            </p>
            {latestBooking && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold text-on-surface-variant">
                  {new Date(latestBooking.createdAt).toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold capitalize text-primary">
                  <Clock3 size={11} /> {latestBooking.status}
                </span>
              </div>
            )}
            {!latestBooking && !isLoading && (
              <button
                type="button"
                onClick={() => navigate('/services')}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-[#191715]"
              >
                Explore services <ArrowRight size={14} />
              </button>
            )}
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-base font-black">Services</h2>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">Browse the live catalog</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
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
              <p className="mt-0.5 text-[11px] text-on-surface-variant">Requests saved to your account</p>
            </div>
            {bookings.length > 0 && <span className="text-[10px] font-bold text-on-surface-variant">{bookings.length} total</span>}
          </div>

          {isLoading ? (
            <div className="ios-card p-5 text-xs text-on-surface-variant">Loading activity…</div>
          ) : !user ? (
            <div className="ios-card p-5">
              <p className="text-sm font-extrabold text-on-surface">Sign in to view your activity</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-primary"
              >
                Sign in <ArrowRight size={14} />
              </button>
            </div>
          ) : bookings.length ? (
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
                      <p className="text-xs font-black text-on-surface">
                        {booking.billingSource === 'subscription'
                          ? 'Pass included'
                          : booking.creditsCharged !== undefined
                            ? `${booking.creditsCharged} credits`
                            : `₹${booking.amount}`}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold capitalize text-primary">
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
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">Your cycle rentals and food orders will show up here.</p>
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
