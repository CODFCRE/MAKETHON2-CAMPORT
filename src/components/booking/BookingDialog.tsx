import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Minus, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { earnService } from '../../features/earn/earnService';
import { marketplaceService } from '../../features/marketplace/marketplaceService';
import { useUserStore } from '../../store/useUserStore';
import type { MarketplaceService } from '../../types/booking';
import PlaceAutocompleteInput from '../maps/PlaceAutocompleteInput';
import type { SelectedPlaceValue } from '../../lib/googleMaps';

interface BookingDialogProps {
  service: MarketplaceService;
  defaultPickup?: string;
  onClose: () => void;
  onBooked: () => void;
}

const BookingDialog: React.FC<BookingDialogProps> = ({
  service,
  defaultPickup = '',
  onClose,
  onBooked,
}) => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [pickup, setPickup] = useState(defaultPickup);
  const [quantity, setQuantity] = useState(1);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const maxQuantity = service.type === 'rent' ? service.maxRentalHours : service.maxOrderQuantity;
  const estimatedCredits = service.type === 'rent'
    ? service.price * service.creditsPerRupee * quantity
    : null;

  const handlePlaceSelect = useCallback((place: SelectedPlaceValue) => {
    setPickup(place.address);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast.error('Sign in to place a request.');
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      if (service.type === 'rent') {
        const rental = await earnService.bookCycleRental(service.listingId, quantity);
        toast.success(
          rental.billing_source === 'subscription'
            ? 'Cycle requested using your pass.'
            : `Cycle requested · ${rental.credits_charged} credits used.`,
        );
      } else {
        await marketplaceService.createFoodOrder(
          service.productId,
          quantity,
          fulfillment,
          fulfillment === 'delivery' ? pickup.trim() : null,
        );
        toast.success('Snack order placed.');
      }
      onBooked();
    } catch (error) {
      console.error('Unable to place marketplace request:', error);
      toast.error(error instanceof Error ? error.message : 'Could not place this request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal((
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-white/10 bg-surface p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {service.type === 'rent' ? 'Cycle rental' : service.storeName}
            </p>
            <h2 id="booking-title" className="mt-1 text-2xl font-black tracking-tight text-white">
              {service.name}
            </h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full bg-white/5 p-2 text-on-surface-variant hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-3">
          {service.image && <img src={service.image} alt="" className="h-16 w-16 rounded-xl object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary">{service.category}</p>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">{service.description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {service.type === 'rent' ? (
            <div className="flex items-start gap-2 rounded-2xl border border-white/5 bg-white/[0.025] p-3 text-xs text-on-surface-variant">
              <MapPin size={15} className="mt-0.5 shrink-0 text-success" />
              <span>{service.pickupLocation}</span>
            </div>
          ) : (
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
                    onChange={setPickup}
                    onPlaceSelect={handlePlaceSelect}
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

          <div className="booking-field flex items-center justify-between rounded-2xl border border-white/5 p-4">
            <div>
              <p className="text-sm font-bold text-white">{service.type === 'rent' ? 'Rental duration' : 'Quantity'}</p>
              <p className="text-xs text-on-surface-variant">
                {service.type === 'rent'
                  ? `${service.price * service.creditsPerRupee} credits per hour outside your pass`
                  : `₹${service.price} ${service.priceUnit}`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label={service.type === 'rent' ? 'Decrease rental hours' : 'Decrease quantity'}
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => value - 1)}
                className="rounded-full bg-white/5 p-2 text-white disabled:opacity-30"
              >
                <Minus size={14} />
              </button>
              <span className="text-center text-sm font-black text-white">
                {quantity}{service.type === 'rent' ? ` ${quantity === 1 ? 'hour' : 'hours'}` : ''}
              </span>
              <button
                type="button"
                aria-label={service.type === 'rent' ? 'Increase rental hours' : 'Increase quantity'}
                disabled={quantity >= maxQuantity}
                onClick={() => setQuantity((value) => value + 1)}
                className="rounded-full bg-white/5 p-2 text-white disabled:opacity-30"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {service.type === 'rent' ? 'Estimated credits' : 'Estimated total'}
              </p>
              <p className="text-2xl font-black text-white">
                {estimatedCredits !== null ? `${estimatedCredits} credits` : `₹${service.price * quantity}`}
              </p>
            </div>
            <button type="submit" disabled={isSubmitting} className="rounded-full bg-primary px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50">
              {isSubmitting ? 'Submitting…' : service.type === 'rent' ? 'Request rental' : 'Place order'}
            </button>
          </div>
          <p className="text-center text-[10px] leading-4 text-on-surface-variant">
            {service.type === 'rent'
              ? 'Your pass eligibility and credit charge are checked by Supabase when you submit.'
              : 'Your order total is calculated from the current menu price on Supabase.'}
          </p>
        </form>
      </section>
    </div>
  ), document.body);
};

export default BookingDialog;
