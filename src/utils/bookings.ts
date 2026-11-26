import type { Booking } from '../types/booking';

const BOOKINGS_KEY = 'jobex-local-bookings';

const isBooking = (value: unknown): value is Booking => {
  if (typeof value !== 'object' || value === null) return false;
  const booking = value as Record<string, unknown>;
  return typeof booking.id === 'string' &&
    typeof booking.serviceId === 'string' &&
    typeof booking.serviceName === 'string' &&
    (booking.type === 'ride' || booking.type === 'snack' || booking.type === 'rent') &&
    typeof booking.amount === 'number' &&
    typeof booking.quantity === 'number' &&
    typeof booking.pickup === 'string' &&
    typeof booking.destination === 'string' &&
    (booking.fulfillment === 'ride' || booking.fulfillment === 'delivery' || booking.fulfillment === 'pickup' || booking.fulfillment === 'rental') &&
    booking.status === 'Requested' &&
    typeof booking.createdAt === 'string';
};

export const getBookings = (): Booking[] => {
  const savedBookings = localStorage.getItem(BOOKINGS_KEY);
  if (!savedBookings) return [];

  const parsedBookings: unknown = JSON.parse(savedBookings);
  if (!Array.isArray(parsedBookings) || !parsedBookings.every(isBooking)) {
    throw new Error('Saved bookings are not in the expected format.');
  }
  return parsedBookings as Booking[];
};

export const saveBooking = (booking: Booking): void => {
  const bookings = getBookings();
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify([booking, ...bookings]));
};
