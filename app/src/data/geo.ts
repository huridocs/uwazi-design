export interface LatLng {
  lat: number;
  lng: number;
}

/** Approximate country centroids (English names) for the Library map view.
 *  Covers the countries present in the seed data, plus the wider region. */
export const countryCoords: Record<string, LatLng> = {
  Argentina: { lat: -38.4, lng: -63.6 },
  Bolivia: { lat: -16.3, lng: -63.6 },
  Brasil: { lat: -14.2, lng: -51.9 },
  Brazil: { lat: -14.2, lng: -51.9 },
  Chile: { lat: -35.7, lng: -71.5 },
  Colombia: { lat: 4.6, lng: -74.3 },
  Ecuador: { lat: -1.8, lng: -78.2 },
  Guyana: { lat: 4.9, lng: -58.9 },
  Paraguay: { lat: -23.4, lng: -58.4 },
  Peru: { lat: -9.2, lng: -75.0 },
  Uruguay: { lat: -32.5, lng: -55.8 },
  Suriname: { lat: 3.9, lng: -56.0 },
  Venezuela: { lat: 6.4, lng: -66.6 },
  Honduras: { lat: 15.2, lng: -86.2 },
  Guatemala: { lat: 15.8, lng: -90.2 },
  Mexico: { lat: 23.6, lng: -102.5 },
  "El Salvador": { lat: 13.8, lng: -88.9 },
};
