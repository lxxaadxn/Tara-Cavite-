import { useState } from 'react';
import { ContentCrudPage, CrudBadge } from '../../components/ContentCrudPage';
import { contentItineraries, type ContentItinerary } from '../../data/mockData';

const emptyForm: Omit<ContentItinerary, 'id'> = {
  title: '',
  route: '',
  stops: 3,
  status: 'draft',
  featured: false,
};

const STATUS_TONE: Record<ContentItinerary['status'], 'green' | 'amber' | 'red'> = {
  published: 'green',
  draft: 'amber',
  flagged: 'red',
};

export function ContentItineraries() {
  const [rows, setRows] = useState(contentItineraries);

  return (
    <ContentCrudPage<ContentItinerary>
      title="Itineraries"
      description="Curated day routes shown in web and mobile (demo local state)."
      rows={rows}
      onChange={setRows}
      emptyForm={emptyForm}
      addLabel="Add itinerary"
      searchKeys={['title', 'route', 'status']}
      statusFilter={{
        options: [
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' },
          { value: 'flagged', label: 'Flagged' },
        ],
        match: (row, value) => row.status === value,
      }}
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'route', label: 'Route', required: true, placeholder: 'e.g. Silang - Tagaytay' },
        { key: 'stops', label: 'Stops', type: 'number' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'flagged', label: 'Flagged' },
          ],
        },
        { key: 'featured', label: 'Featured', type: 'checkbox' },
      ]}
      columns={[
        { key: 'title', header: 'Title', render: (r) => <strong>{r.title}</strong> },
        { key: 'route', header: 'Route', render: (r) => r.route },
        { key: 'stops', header: 'Stops', render: (r) => r.stops },
        {
          key: 'featured',
          header: 'Featured',
          render: (r) => (r.featured ? <CrudBadge label="Yes" tone="blue" /> : '—'),
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => <CrudBadge label={r.status} tone={STATUS_TONE[r.status]} />,
        },
      ]}
    />
  );
}
