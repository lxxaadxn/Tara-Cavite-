import { AdminPlaceholder } from '../components/AdminPlaceholder';

export function MobileAppReleases() {
  return (
    <AdminPlaceholder
      title="App releases (Mobile)"
      description="Track build numbers, forced-update rules, and store listing notes."
      bullets={[
        'Set minimum supported app version',
        'Maintenance mode banner copy',
        'Link to TestFlight / Play Internal testing builds',
      ]}
    />
  );
}
