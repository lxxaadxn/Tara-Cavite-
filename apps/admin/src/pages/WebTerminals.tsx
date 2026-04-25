import { AdminPlaceholder } from '../components/AdminPlaceholder';

export function WebTerminals() {
  return (
    <AdminPlaceholder
      title="Terminals (Web)"
      description="Manage Cavite terminal listings, copy, and gallery assets shown on the web Terminals map and detail pages."
      bullets={[
        'CRUD terminal records (title, address, route path, gallery URLs)',
        'Sync with public `routeTerminals` / map markers',
        'Preview OSRM corridor vs straight-line fallback',
        'Publish / hide terminals without redeploying the web app',
      ]}
    />
  );
}
