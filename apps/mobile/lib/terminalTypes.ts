export interface Terminal {
  id: string;
  name: string;
  /** City or municipality for location filter */
  municipality: string;
  /** Subtitle under title, e.g. barangay, city, region */
  addressLine?: string;
  /** Long description for detail “Description” tab */
  description?: string;
  category: 'dasma-bayan' | 'other';
  transportTypes: string[];
  status: 'OPEN' | 'CLOSED';
  operatingHours: string;
  averageFare: string;
  paymentType: string;
  /** Simple route list when the terminal has no gate groupings */
  primaryRoutes: { label: string }[];
  /** PITX-style: routes grouped by gate (accordion in UI) */
  routesByGate?: { gateName: string; routes: { label: string }[] }[];
  reminders: string[];
  latitude: number;
  longitude: number;
}
