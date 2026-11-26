import React from 'react';
import { ArrowUpRight, Clock3, Star } from 'lucide-react';
import type { MarketplaceService } from '../../types/booking';

interface ServiceCardProps {
  service: MarketplaceService;
  onSelect: (service: MarketplaceService) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onSelect }) => (
  <article className="ios-card overflow-hidden group">
    <div className="media-overlay relative h-48 overflow-hidden">
      <img
        src={service.image}
        alt={service.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      {service.badge && (
        <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md">
          {service.badge}
        </span>
      )}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{service.category}</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">{service.name}</h3>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
          <Star size={12} className="fill-warning text-warning" /> {service.rating}
        </span>
      </div>
    </div>

    <div className="p-4">
      <p className="min-h-10 text-sm leading-5 text-on-surface-variant">{service.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-black tracking-tight text-white">₹{service.price}</p>
          <p className="text-[10px] font-medium text-on-surface-variant">{service.priceUnit}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant">
          <Clock3 size={13} /> {service.eta}
        </div>
        <button
          type="button"
          onClick={() => onSelect(service)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/20 transition hover:brightness-110 active:scale-95"
        >
          {service.type === 'ride' ? 'Book ride' : service.type === 'rent' ? 'Rent cycle' : 'Order'} <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  </article>
);

export default ServiceCard;
