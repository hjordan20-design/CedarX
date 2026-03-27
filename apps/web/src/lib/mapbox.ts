const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;

/**
 * Build a Mapbox static satellite image URL for a lat/lng coordinate.
 * Returns null if no token is configured or coordinates are missing.
 */
export function mapboxSatUrl(lat?: number, lng?: number): string | null {
  if (!MAPBOX_TOKEN || lat == null || lng == null) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},14,0/800x400?access_token=${MAPBOX_TOKEN}`;
}
