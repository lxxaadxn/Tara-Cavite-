import { AdminPlaceholder } from '../components/AdminPlaceholder';

export function MobileMapCommute() {
  return (
    <AdminPlaceholder
      title="Map & commute (Mobile)"
      description="Configure map defaults, browse POI datasets, and commute-related overlays used in the mobile Map stack."
      bullets={[
        'Toggle map layers and default region (Cavite bounds)',
        'Manage commute presets and NTDP labels',
        'Coordinate with `placesFromSupabase` / geocoded JSON sources',
      ]}
    />
  );
}
