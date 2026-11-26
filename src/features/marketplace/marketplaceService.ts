import { supabase } from '../../lib/supabaseClient';
import type { Booking, MarketplaceService } from '../../types/booking';

interface CycleServiceRecord {
  credits_per_rupee: number;
  max_rental_hours: number;
  price_unit: string;
  eta: string;
}

export interface CycleListing {
  id: string;
  owner_id: string;
  model: string;
  gear_type: 'geared' | 'non_geared';
  description: string;
  hourly_rate: number;
  pickup_location: string;
  image_path: string;
  status: 'available' | 'rented' | 'paused';
  created_at: string;
}

export interface NewCycleListing {
  model: string;
  gearType: 'geared' | 'non_geared';
  description: string;
  hourlyRate: number;
  pickupLocation: string;
  photo: File;
}

interface FoodProductRecord {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  max_order_quantity: number;
  price_unit: string;
  eta: string;
  badge: string | null;
  image_path: string | null;
  food_stores: { name: string } | null;
}

interface FoodOrderRecord {
  id: string;
  fulfillment: 'delivery' | 'pickup';
  delivery_address: string | null;
  status: string;
  total: number;
  created_at: string;
  food_stores: { name: string } | null;
  food_order_items: Array<{
    product_name: string;
    quantity: number;
  }>;
}

const throwIfError = (error: { message: string } | null): void => {
  if (error) throw new Error(error.message);
};

const getProductImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return supabase.storage.from('marketplace-media').getPublicUrl(imagePath).data.publicUrl;
};

const toFoodBooking = (order: FoodOrderRecord): Booking => {
  const firstItem = order.food_order_items[0];
  return {
    id: order.id,
    serviceId: order.id,
    serviceName: firstItem?.product_name ?? 'Food order',
    type: 'snack',
    amount: Number(order.total),
    quantity: firstItem?.quantity ?? 1,
    pickup: order.fulfillment === 'delivery'
      ? order.delivery_address ?? ''
      : order.food_stores?.name ?? 'Store pickup',
    fulfillment: order.fulfillment,
    status: order.status.replaceAll('_', ' '),
    createdAt: order.created_at,
  };
};

export const marketplaceService = {
  async getServices(): Promise<MarketplaceService[]> {
    const [cycleConfigResult, cycleListingsResult, foodResult] = await Promise.all([
      supabase
        .from('cycle_service_catalog')
        .select('credits_per_rupee, max_rental_hours, price_unit, eta')
        .eq('id', 'cycle-rental')
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('cycle_listings')
        .select('id, owner_id, model, gear_type, description, hourly_rate, pickup_location, image_path, status, created_at')
        .eq('status', 'available')
        .order('created_at', { ascending: false }),
      supabase
        .from('food_products')
        .select('id, store_id, name, description, category, price, max_order_quantity, price_unit, eta, badge, image_path, food_stores!inner(name, is_active)')
        .eq('is_available', true)
        .eq('food_stores.is_active', true)
        .order('name'),
    ]);

    throwIfError(cycleConfigResult.error);
    throwIfError(cycleListingsResult.error);
    throwIfError(foodResult.error);

    const cycleService = cycleConfigResult.data as CycleServiceRecord | null;
    if ((cycleListingsResult.data?.length ?? 0) > 0 && !cycleService) {
      throw new Error('Cycle rental settings are missing from Supabase.');
    }
    const cycleListings = (cycleListingsResult.data ?? []) as CycleListing[];
    const foodProducts = (foodResult.data ?? []) as unknown as FoodProductRecord[];
    const services: MarketplaceService[] = [];

    if (cycleService) {
      services.push(...cycleListings.map((listing) => ({
        id: listing.id,
        type: 'rent' as const,
        listingId: listing.id,
        pickupLocation: listing.pickup_location,
        name: listing.model,
        description: listing.description,
        category: listing.gear_type === 'geared' ? 'Geared' : 'Non-geared',
        price: listing.hourly_rate,
        priceUnit: cycleService.price_unit,
        rating: null,
        eta: cycleService.eta,
        image: getProductImageUrl(listing.image_path),
        badge: null,
        maxRentalHours: cycleService.max_rental_hours,
        creditsPerRupee: cycleService.credits_per_rupee,
      })));
    }

    services.push(...foodProducts.map((product) => ({
      id: product.id,
      productId: product.id,
      storeId: product.store_id,
      storeName: product.food_stores?.name ?? '',
      type: 'snack' as const,
      name: product.name,
      description: product.description ?? '',
      category: product.category ?? '',
      price: Number(product.price),
      priceUnit: product.price_unit,
      rating: null,
      eta: product.eta,
      image: getProductImageUrl(product.image_path),
      badge: product.badge,
      maxOrderQuantity: product.max_order_quantity,
    })));

    return services;
  },

  async createFoodOrder(
    productId: string,
    quantity: number,
    fulfillment: 'delivery' | 'pickup',
    deliveryAddress: string | null,
  ): Promise<void> {
    const { error } = await supabase.rpc('create_food_order', {
      p_product_id: productId,
      p_quantity: quantity,
      p_fulfillment: fulfillment,
      p_delivery_address: deliveryAddress,
    });
    throwIfError(error);
  },

  async getMyCycleListings(ownerId: string): Promise<CycleListing[]> {
    const { data, error } = await supabase
      .from('cycle_listings')
      .select('id, owner_id, model, gear_type, description, hourly_rate, pickup_location, image_path, status, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    throwIfError(error);
    return (data ?? []) as CycleListing[];
  },

  async createCycleListing(ownerId: string, listing: NewCycleListing): Promise<void> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(listing.photo.type)) {
      throw new Error('Choose a JPG, PNG, or WebP cycle photo.');
    }
    if (listing.photo.size > 10 * 1024 * 1024) {
      throw new Error('The cycle photo must be 10 MB or smaller.');
    }

    const extension = listing.photo.type.split('/')[1].replace('jpeg', 'jpg');
    const imagePath = `${ownerId}/${crypto.randomUUID()}.${extension}`;
    const storage = supabase.storage.from('marketplace-media');
    const { error: uploadError } = await storage.upload(imagePath, listing.photo, {
      contentType: listing.photo.type,
      upsert: false,
    });
    throwIfError(uploadError);

    const { error: insertError } = await supabase.from('cycle_listings').insert({
      owner_id: ownerId,
      model: listing.model.trim(),
      gear_type: listing.gearType,
      description: listing.description.trim(),
      hourly_rate: listing.hourlyRate,
      pickup_location: listing.pickupLocation.trim(),
      image_path: imagePath,
    });

    if (insertError) {
      const { error: cleanupError } = await storage.remove([imagePath]);
      if (cleanupError) console.error('Unable to remove unlinked cycle photo:', cleanupError);
      throw new Error(insertError.message);
    }
  },

  async updateCycleListingStatus(
    listingId: string,
    ownerId: string,
    status: CycleListing['status'],
  ): Promise<void> {
    const { data, error } = await supabase
      .from('cycle_listings')
      .update({ status })
      .eq('id', listingId)
      .eq('owner_id', ownerId)
      .select('id')
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new Error('Cycle listing was not found or is no longer yours.');
  },

  async getFoodOrderBookings(userId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('food_orders')
      .select('id, fulfillment, delivery_address, status, total, created_at, food_stores(name), food_order_items(product_name, quantity)')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    throwIfError(error);
    return ((data ?? []) as unknown as FoodOrderRecord[]).map(toFoodBooking);
  },
};
