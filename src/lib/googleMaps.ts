export const GOOGLE_MAPS_API_KEY: string =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const isGoogleMapsConfigured = Boolean(GOOGLE_MAPS_API_KEY);

export const GMP_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];
export const GMP_MAP_ID = 'DEMO_MAP_ID';

export interface SelectedPlaceValue {
  address: string;
  name?: string;
  location?: google.maps.LatLngLiteral;
  placeId?: string;
}

export function isMapsQuotaError(error: unknown): boolean {
  if (!error) return false;
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'object'
        ? JSON.stringify(error)
        : String(error);

  return (
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OverQuotaMapError') ||
    text.includes('QuotaExceededError') ||
    text.includes('429')
  );
}

export function reportIfMapsQuotaError(error: unknown): boolean {
  if (isMapsQuotaError(error)) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}
