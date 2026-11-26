import React, { useEffect, useState } from 'react';
import { Bike, Check, MapPin, Pause, Play, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { marketplaceService, type CycleListing } from '../features/marketplace/marketplaceService';
import { useUserStore } from '../store/useUserStore';
import { supabase } from '../lib/supabaseClient';

const CycleRenterDashboard: React.FC = () => {
  const { user } = useUserStore();
  const [listings, setListings] = useState<CycleListing[]>([]);
  const [model, setModel] = useState('');
  const [gearType, setGearType] = useState<'geared' | 'non_geared'>('non_geared');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refreshListings = async () => {
    if (!user) return;
    setListings(await marketplaceService.getMyCycleListings(user.id));
  };

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsLoading(false);
      return;
    }

    marketplaceService.getMyCycleListings(user.id)
      .then((result) => {
        if (active) {
          setListings(result);
          setError('');
        }
      })
      .catch((loadError: unknown) => {
        console.error('Unable to load cycle listings:', loadError);
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load your listings.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const submitListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !photo) {
      setError('Sign in and add a cycle photo before publishing.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await marketplaceService.createCycleListing(user.id, {
        model,
        gearType,
        description,
        hourlyRate: Number(hourlyRate),
        pickupLocation,
        photo,
      });
      await refreshListings();
      setModel('');
      setDescription('');
      setHourlyRate('');
      setPickupLocation('');
      setPhoto(null);
      setPhotoInputKey((key) => key + 1);
      toast.success('Cycle listing published.');
    } catch (submitError) {
      console.error('Unable to publish cycle listing:', submitError);
      const message = submitError instanceof Error ? submitError.message : 'Could not publish this cycle.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setListingStatus = async (listing: CycleListing) => {
    if (!user) return;
    const status = listing.status === 'available' ? 'paused' : 'available';
    try {
      await marketplaceService.updateCycleListingStatus(listing.id, user.id, status);
      await refreshListings();
      toast.success(status === 'available' ? 'Cycle is available for rent.' : 'Cycle listing paused.');
    } catch (updateError) {
      console.error('Unable to update cycle listing:', updateError);
      const message = updateError instanceof Error ? updateError.message : 'Could not update this listing.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-background px-5 pb-28 pt-5 text-on-surface lg:px-8 lg:pb-12 lg:pt-8">
      <header className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Cycle owner</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Renter dashboard</h1>
        <p className="mt-2 text-sm text-on-surface-variant">List a cycle, set your rate and pickup point, and manage its availability.</p>
      </header>

      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-xs text-error">
          {error}
        </div>
      )}

      <form onSubmit={submitListing} className="ios-card mb-7 space-y-4 p-5">
        <h2 className="text-base font-black">Add a cycle</h2>
        <label className="block text-xs font-bold text-on-surface-variant">
          Model
          <input required minLength={2} maxLength={100} value={model} onChange={(event) => setModel(event.target.value)} className="booking-field mt-2 h-12 w-full rounded-xl px-4 text-sm text-white" placeholder="Cycle model" />
        </label>
        <label className="block text-xs font-bold text-on-surface-variant">
          Gear type
          <select value={gearType} onChange={(event) => setGearType(event.target.value as 'geared' | 'non_geared')} className="booking-field mt-2 h-12 w-full rounded-xl px-4 text-sm text-white">
            <option value="geared">Geared</option>
            <option value="non_geared">Non-geared</option>
          </select>
        </label>
        <label className="block text-xs font-bold text-on-surface-variant">
          Description
          <textarea required minLength={10} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className="booking-field mt-2 min-h-24 w-full rounded-xl p-4 text-sm text-white" placeholder="Describe the cycle condition and features" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold text-on-surface-variant">
            Hourly rate (₹)
            <input required type="number" min={1} step={1} value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} className="booking-field mt-2 h-12 w-full rounded-xl px-4 text-sm text-white" />
          </label>
          <label className="block text-xs font-bold text-on-surface-variant">
            Pickup location
            <input required minLength={3} value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} className="booking-field mt-2 h-12 w-full rounded-xl px-4 text-sm text-white" placeholder="Area or landmark" />
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 p-4 text-xs font-bold text-on-surface-variant">
          <Upload size={17} className="text-primary" />
          <span className="min-w-0 flex-1 truncate">{photo?.name ?? 'Upload a cycle photo (JPG, PNG or WebP)'}</span>
          <input key={photoInputKey} required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} className="sr-only" />
        </label>
        <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-primary px-5 py-3 text-sm font-black text-[#191715] disabled:opacity-50">
          {isSubmitting ? 'Publishing…' : 'Publish cycle'}
        </button>
      </form>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black">Your listings</h2>
          <span className="text-xs text-on-surface-variant">{listings.length}</span>
        </div>
        {isLoading ? (
          <div className="ios-card p-5 text-sm text-on-surface-variant">Loading listings…</div>
        ) : listings.length ? (
          <div className="space-y-3">
            {listings.map((listing) => {
              const imageUrl = supabase.storage.from('marketplace-media').getPublicUrl(listing.image_path).data.publicUrl;
              return (
                <article key={listing.id} className="ios-card flex gap-4 p-4">
                  <img src={imageUrl} alt={listing.model} className="h-24 w-24 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="truncate text-sm font-black">{listing.model}</h3>
                        <p className="mt-1 text-[10px] capitalize text-on-surface-variant">{listing.gear_type.replace('_', '-')} · ₹{listing.hourly_rate}/hour</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold capitalize text-primary">{listing.status}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] text-on-surface-variant">{listing.description}</p>
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-on-surface-variant"><MapPin size={11} />{listing.pickup_location}</p>
                    <button
                      type="button"
                      onClick={() => void setListingStatus(listing)}
                      className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-40"
                    >
                      {listing.status === 'available' ? <Pause size={12} /> : listing.status === 'rented' ? <Check size={12} /> : <Play size={12} />}
                      {listing.status === 'available' ? 'Pause' : listing.status === 'rented' ? 'Mark returned' : 'Make available'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="ios-card flex items-center gap-3 p-5 text-sm text-on-surface-variant">
            <Bike size={18} className="text-primary" /> Your published cycles will appear here.
          </div>
        )}
      </section>
    </div>
  );
};

export default CycleRenterDashboard;
