import React, { useEffect, useMemo, useState } from 'react';
import { Bike, PackageCheck, Search, Sandwich } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BookingDialog from '../components/booking/BookingDialog';
import ServiceCard from '../components/booking/ServiceCard';
import { marketplaceService } from '../features/marketplace/marketplaceService';
import type { MarketplaceService, ServiceType } from '../types/booking';

type ServiceFilter = ServiceType | 'all';
interface ServiceCategory {
  id: string;
  title: string;
  type: ServiceType;
  service: MarketplaceService;
  count: number;
}

const categoryKey = (service: MarketplaceService) =>
  `${service.type}:${service.category || service.storeName || service.name}`;

const Services: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [selectedService, setSelectedService] = useState<MarketplaceService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const requestedType = searchParams.get('type');
  const activeType: ServiceFilter =
    requestedType === 'rent' || requestedType === 'snack' ? requestedType : 'all';
  const selectedCategory = searchParams.get('category');

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
    const groups = new Map<string, ServiceCategory>();
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
          service,
          count: 1,
        });
      }
    }
    return [...groups.values()];
  }, [services]);

  const results = useMemo(() => services.filter((service) => {
    const matchesType = activeType === 'all' || service.type === activeType;
    const matchesCategory = !selectedCategory || categoryKey(service) === selectedCategory;
    const searchText = `${service.name} ${service.description} ${service.category} ${service.storeName ?? ''}`;
    return matchesType && matchesCategory && searchText.toLowerCase().includes(query.trim().toLowerCase());
  }), [activeType, query, selectedCategory, services]);

  const selectCategory = (category: ServiceCategory) => {
    setSearchParams({ type: category.type, category: category.id });
  };
  const selectType = (type: ServiceFilter) => {
    setSearchParams(type === 'all' ? {} : { type });
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-4 text-on-surface lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-8">
      <div className="mb-5 flex items-end justify-between gap-3 lg:mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Camport</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white lg:text-4xl">Services</h1>
          <p className="mt-1 text-xs text-on-surface-variant lg:text-sm">Browse the current Supabase catalog.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/renter')}
          className="shrink-0 rounded-full border border-primary/30 px-4 py-2.5 text-[10px] font-black text-primary"
        >
          List your cycle
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-xs text-error">
          {error}
        </div>
      )}

      {categories.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
          {categories.map((category) => {
            const Icon = category.type === 'rent' ? Bike : category.type === 'snack' ? Sandwich : PackageCheck;
            const isSelected = selectedCategory === category.id;
            return (
              <button
                type="button"
                key={category.id}
                onClick={() => selectCategory(category)}
                className={`media-overlay group relative h-[112px] overflow-hidden rounded-[19px] border text-left text-white transition active:scale-[0.98] lg:h-44 lg:rounded-3xl ${isSelected ? 'border-primary shadow-[0_0_0_2px_rgba(247,168,115,0.3)]' : 'border-white/5'}`}
              >
                {category.service.image && (
                  <img src={category.service.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />
                <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur"><Icon size={15} /></span>
                <span className="absolute inset-x-3 bottom-3">
                  <span className="block text-base font-black">{category.title}</span>
                  <span className="mt-0.5 block text-[10px] font-medium text-white/70">{category.count} available</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 inline-flex rounded-2xl border border-white/5 bg-white/5 p-1">
        {([
          { type: 'all' as const, label: 'All', icon: PackageCheck },
          { type: 'rent' as const, label: 'Rentals', icon: Bike },
          { type: 'snack' as const, label: 'Snacks', icon: Sandwich },
        ]).map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => selectType(type)}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${activeType === type ? 'bg-primary text-[#211914]' : 'text-on-surface-variant hover:text-white'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <label className="mb-5 mt-4 flex h-12 items-center gap-3 rounded-2xl border border-white/5 bg-surface px-4 text-on-surface-variant">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search services and menu items"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
        />
      </label>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant">
          {selectedCategory
            ? categories.find((category) => category.id === selectedCategory)?.title
            : activeType === 'snack'
              ? 'Order snacks'
              : 'Available now'}
        </h2>
        <span className="text-xs text-on-surface-variant">{results.length} options</span>
      </div>
      {isLoading ? (
        <div className="ios-card px-6 py-12 text-center text-sm text-on-surface-variant">Loading services…</div>
      ) : results.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((service) => (
            <ServiceCard key={service.id} service={service} onSelect={setSelectedService} />
          ))}
        </div>
      ) : (
        <div className="ios-card px-6 py-12 text-center">
          <p className="font-bold text-white">{error ? 'Services could not be loaded' : 'No services available'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {error ? 'Check your Supabase configuration and try again.' : 'The catalog is empty or your search has no matches.'}
          </p>
        </div>
      )}

      {selectedService && (
        <BookingDialog
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onBooked={() => navigate('/orders')}
        />
      )}
    </div>
  );
};

export default Services;
