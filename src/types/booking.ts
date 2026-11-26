export type ServiceType = 'snack' | 'rent';

interface MarketplaceServiceBase {
  id: string;
  storeName?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  priceUnit: string;
  rating: number | null;
  eta: string;
  image: string | null;
  badge?: string | null;
}

export type MarketplaceService =
  | (MarketplaceServiceBase & {
      type: 'rent';
      listingId: string;
      pickupLocation: string;
      maxRentalHours: number;
      creditsPerRupee: number;
    })
  | (MarketplaceServiceBase & {
      type: 'snack';
      productId: string;
      storeId: string;
      storeName: string;
      maxOrderQuantity: number;
    });

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  type: ServiceType;
  amount: number;
  quantity: number;
  pickup: string;
  fulfillment: 'delivery' | 'pickup' | 'rental';
  status: string;
  createdAt: string;
  billingSource?: 'credits' | 'subscription';
  creditsCharged?: number;
}
