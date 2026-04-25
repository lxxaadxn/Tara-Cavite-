import { AdminPlaceholder } from '../components/AdminPlaceholder';

export function WebContent() {
  return (
    <AdminPlaceholder
      title="Content & landing (Web)"
      description="Control marketing copy, hero CTAs, feature sections, and SEO metadata for the public web app."
      bullets={[
        'Edit landing hero, testimonials, and footer links',
        'Manage meta title/description per route',
        'Featured spots block on homepage',
        'Legal pages (privacy, terms) versioning',
      ]}
    />
  );
}
