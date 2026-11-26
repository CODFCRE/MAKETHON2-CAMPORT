import React, { useMemo, useState } from 'react';
import { Bike, PackageCheck, Search, Sandwich } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BookingDialog from '../components/booking/BookingDialog';
import ServiceCard from '../components/booking/ServiceCard';
import { services } from '../data/marketplace';
import type { MarketplaceService, ServiceType } from '../types/booking';

const categories = [
  { id: 'ride', title: 'Ride', subtitle: 'E-rickshaw rides', type: 'ride' as const, serviceId: 'electric-rickshaw', icon: Bike },
  { id: 'delivery', title: 'Delivery', subtitle: 'Local delivery', type: 'snack' as const, serviceId: 'street-snack-box', icon: PackageCheck },
  { id: 'rent', title: 'Rent', subtitle: 'Cycle by the hour', type: 'rent' as const, serviceId: 'cycle-rental', icon: Bike },
  { id: 'food', title: 'Food', subtitle: 'Fresh nearby bites', type: 'snack' as const, serviceId: 'masala-chai', icon: Sandwich },
];

const Services: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = categories.find((category) => category.id === searchParams.get('category'));
  const requestedType = searchParams.get('type');
  const activeType: ServiceType = selectedCategory?.type ?? (requestedType === 'snack' || requestedType === 'rent' ? requestedType : 'ride');
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [selectedService, setSelectedService] = useState<MarketplaceService | null>(null);
  const defaultDestination = searchParams.get('destination') ?? '';
  const selectCategory = (category: (typeof categories)[number]) => {
    const params = new URLSearchParams({ type: category.type, category: category.id });
    if (category.type === 'ride' && defaultDestination) {
      params.set('destination', defaultDestination);
    }
    setSearchParams(params);
  };
  const selectType = (type: ServiceType) => {
    const params = new URLSearchParams({ type });
    if (type === 'ride' && defaultDestination) {
      params.set('destination', defaultDestination);
    }
    setSearchParams(params);
  };
  const results = useMemo(() => services.filter((service) =>
    service.type === activeType &&
    (!selectedCategory || service.id === selectedCategory.serviceId) &&
    `${service.name} ${service.description} ${service.category}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [activeType, query, selectedCategory]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pb-28 pt-4 text-on-surface lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-8">
      <div className="mb-5 lg:mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Camport</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-white lg:text-4xl">Services</h1>
        <p className="mt-1 text-xs text-on-surface-variant lg:text-sm">Choose what you need today.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        {categories.map((category) => {
          const service = services.find((item) => item.id === category.serviceId);
          const Icon = category.icon;
          const isSelected = selectedCategory?.id === category.id;
          return (
            <button
              type="button"
              key={category.id}
              onClick={() => selectCategory(category)}
              className={`media-overlay group relative h-[112px] overflow-hidden rounded-[19px] border text-left text-white transition active:scale-[0.98] lg:h-44 lg:rounded-3xl ${isSelected ? 'border-primary shadow-[0_0_0_2px_rgba(247,168,115,0.3)]' : 'border-white/5'}`}
            >
              {service && <img src={service.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />
              <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur"><Icon size={15} /></span>
              <span className="absolute inset-x-3 bottom-3">
                <span className="block text-base font-black">{category.title}</span>
                <span className="mt-0.5 block text-[10px] font-medium text-white/70">{category.subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 inline-flex rounded-2xl border border-white/5 bg-white/5 p-1">
        {([
          { type: 'ride' as const, label: 'Rides', icon: Bike },
          { type: 'rent' as const, label: 'Rent', icon: Bike },
          { type: 'snack' as const, label: 'Food & delivery', icon: Sandwich },
        ]).map(({ type, label, icon: Icon }) => (
          <button key={type} onClick={() => selectType(type)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${activeType === type ? 'bg-primary text-[#211914]' : 'text-on-surface-variant hover:text-white'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <label className="mb-5 mt-4 flex h-12 items-center gap-3 rounded-2xl border border-white/5 bg-surface px-4 text-on-surface-variant">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeType === 'ride' ? 'Search e-rickshaw rides' : activeType === 'rent' ? 'Search cycle rentals' : 'Search chai, snacks and more'} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500" />
      </label>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant">{selectedCategory?.title ?? (activeType === 'ride' ? 'Nearby rides' : 'Nearby food & delivery')}</h2>
        <span className="text-xs text-on-surface-variant">{results.length} options</span>
      </div>
      {results.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((service) => <ServiceCard key={service.id} service={service} onSelect={setSelectedService} />)}
        </div>
      ) : (
        <div className="ios-card px-6 py-12 text-center">
          <p className="font-bold text-white">Nothing found yet</p>
          <p className="mt-2 text-sm text-on-surface-variant">Try another search or choose a different service.</p>
        </div>
      )}

      {selectedService && (
        <BookingDialog
          service={selectedService}
          defaultDestination={defaultDestination}
          onClose={() => setSelectedService(null)}
          onBooked={() => navigate('/orders')}
        />
      )}
    </div>
  );
};

export default Services;
