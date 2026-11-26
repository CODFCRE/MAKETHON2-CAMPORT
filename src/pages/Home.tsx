import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, Bike, PackageCheck, Sandwich, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BookingDialog from '../components/booking/BookingDialog';
import { marketplaceService } from '../features/marketplace/marketplaceService';
import type { MarketplaceService, ServiceType } from '../types/booking';

const categoryKey = (service: MarketplaceService) =>
  `${service.type}:${service.category || service.storeName || service.name}`;

const Home: React.FC = () => {
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [selectedService, setSelectedService] = useState<MarketplaceService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    marketplaceService.getServices()
      .then((catalog) => {
        if (active) {
          setServices(catalog);
          setError('');
        }
      })
      .catch((loadError: unknown) => {
        console.error('Unable to load marketplace catalog:', loadError);
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load services.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const groups = new Map<string, { id: string; title: string; type: ServiceType; count: number }>();
    for (const service of services) {
      const id = categoryKey(service);
      const group = groups.get(id);
      if (group) {
        group.count += 1;
      } else {
        groups.set(id, {
          id,
          title: service.category || service.storeName || service.name,
          type: service.type,
          count: 1,
        });
      }
    }
    return [...groups.values()];
  }, [services]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-5 text-on-surface lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-8">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Camport</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Neighborhood services</h1>
        </div>
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
      </header>

      <section className="relative overflow-hidden rounded-[26px] bg-primary px-5 py-5 text-[#191715] shadow-sm lg:px-8 lg:py-7">
        <div className="relative z-10 max-w-[72%]">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/55">Camport · local services</p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight lg:text-4xl">Your neighborhood,<br />one tap away.</h2>
          <p className="mt-2 max-w-sm text-xs font-medium text-black/65 lg:text-sm">Rent a cycle or order snacks from the live catalog.</p>
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
        </div>
      </section>

      <section className="ios-card mt-4 flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Sandwich size={19} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-on-surface">Order snacks</h2>
            <p className="mt-0.5 text-[10px] text-on-surface-variant">Browse the live menu</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/services?type=snack')}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-2.5 text-[10px] font-black text-[#191715]"
        >
          Browse <ArrowRight size={13} />
        </button>
      </section>

      {error && (
        <div role="alert" className="mt-5 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-xs text-error">
          {error}
        </div>
      )}

      <div className="mt-7 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight">Browse categories</h2>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">Categories come from the live catalog.</p>
            </div>
            <button onClick={() => navigate('/services')} className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              View all <ArrowRight size={14} />
            </button>
          </div>
          {isLoading ? (
            <div className="ios-card p-5 text-xs text-on-surface-variant">Loading catalog…</div>
          ) : categories.length ? (
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => {
                const Icon = category.type === 'rent' ? Bike : category.type === 'snack' ? Sandwich : PackageCheck;
                return (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => navigate(`/services?type=${category.type}&category=${encodeURIComponent(category.id)}`)}
                    className="ios-card group flex min-h-[82px] items-center gap-3 p-3 text-left transition active:scale-[0.98] hover:border-primary/30"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-extrabold text-on-surface">{category.title}</span>
                      <span className="mt-1 block truncate text-[10px] text-on-surface-variant">{category.count} available</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="ios-card p-5 text-xs text-on-surface-variant">
              {error ? 'Catalog data could not be loaded.' : 'No services are available yet.'}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight">Available now</h2>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">Listings and prices from Supabase.</p>
            </div>
            <button onClick={() => navigate('/services')} className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              See all <ArrowRight size={14} />
            </button>
          </div>
          {isLoading ? (
            <div className="ios-card p-5 text-xs text-on-surface-variant">Loading services…</div>
          ) : services.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {services.slice(0, 4).map((service) => (
                <article key={service.id} className="ios-card overflow-hidden">
                  {service.image && (
                    <div className="media-overlay relative h-28 overflow-hidden">
                      <img src={service.image} alt={service.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-1 text-[9px] font-bold text-white">
                        {service.category}
                      </span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="line-clamp-1 text-xs font-extrabold text-on-surface">{service.name}</p>
                    {service.storeName && <p className="mt-1 text-[10px] text-on-surface-variant">{service.storeName}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-on-surface">
                        ₹{service.price}<span className="ml-1 font-medium text-on-surface-variant">{service.priceUnit}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedService(service)}
                        className="rounded-full bg-primary px-3 py-2 text-[10px] font-black text-[#191715]"
                      >
                        {service.type === 'rent' ? 'Rent cycle' : 'Order'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ios-card p-5 text-xs text-on-surface-variant">
              {error ? 'Service listings could not be loaded.' : 'Add active cycle or food listings in Supabase to get started.'}
            </div>
          )}
        </section>
      </div>

      {selectedService && (
        <BookingDialog
          service={selectedService}
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
