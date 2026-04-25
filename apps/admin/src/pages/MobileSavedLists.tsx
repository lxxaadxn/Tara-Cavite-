import { AdminPlaceholder } from '../components/AdminPlaceholder';

export function MobileSavedLists() {
  return (
    <AdminPlaceholder
      title="Saved lists (Mobile)"
      description="Inspect saved lists synced from Supabase: counts, sharing flags, and abusive content."
      bullets={[
        'Search lists by user or name',
        'View item counts and list type (private/shared)',
        'Disable or clear lists that violate guidelines',
      ]}
    />
  );
}
