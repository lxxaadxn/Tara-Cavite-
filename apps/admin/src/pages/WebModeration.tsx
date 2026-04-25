import { AdminPlaceholder } from '../components/AdminPlaceholder';

export function WebModeration() {
  return (
    <AdminPlaceholder
      title="Reviews & moderation (Web)"
      description="Queue for user-generated reviews and reports from the web place detail experience."
      bullets={[
        'Approve, reject, or flag reviews',
        'Bulk actions and search by place or user',
        'Export audit log for compliance',
      ]}
    />
  );
}
