import { AdminPlaceholder } from '../components/AdminPlaceholder';

export function MobileItineraries() {
  return (
    <AdminPlaceholder
      title="Itineraries (Mobile)"
      description="Oversee published and draft itineraries created in the mobile app: stops, dates, and visibility."
      bullets={[
        'List user itineraries with status (draft / published)',
        'Feature curated itineraries in Explore',
        'Remove spam or policy-violating plans',
      ]}
    />
  );
}
