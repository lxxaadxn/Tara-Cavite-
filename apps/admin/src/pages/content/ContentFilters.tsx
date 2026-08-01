import { useState } from 'react';
import { ContentCrudPage, CrudBadge } from '../../components/ContentCrudPage';
import { contentFilters, type ContentFilter } from '../../data/mockData';

const emptyForm: Omit<ContentFilter, 'id'> = {
  label: '',
  key: '',
  kind: 'ntdp',
  enabled: true,
  sortOrder: 1,
};

export function ContentFilters() {
  const [rows, setRows] = useState(contentFilters);

  return (
    <ContentCrudPage<ContentFilter>
      title="Filters"
      description="System filter chips for search and browse (NTDP categories, cities, type codes)."
      rows={rows}
      onChange={setRows}
      emptyForm={emptyForm}
      addLabel="Add filter"
      searchKeys={['label', 'key', 'kind']}
      statusFilter={{
        options: [
          { value: 'enabled', label: 'Enabled' },
          { value: 'disabled', label: 'Disabled' },
        ],
        match: (row, value) => (value === 'enabled' ? row.enabled : !row.enabled),
      }}
      fields={[
        { key: 'label', label: 'Label', required: true },
        { key: 'key', label: 'Key', required: true, placeholder: 'e.g. cafe' },
        {
          key: 'kind',
          label: 'Kind',
          type: 'select',
          options: [
            { value: 'ntdp', label: 'NTDP category' },
            { value: 'city', label: 'City / LGU' },
            { value: 'type', label: 'Type code' },
          ],
        },
        { key: 'sortOrder', label: 'Sort order', type: 'number' },
        { key: 'enabled', label: 'Enabled', type: 'checkbox' },
      ]}
      columns={[
        { key: 'label', header: 'Label', render: (r) => <strong>{r.label}</strong> },
        { key: 'key', header: 'Key', render: (r) => r.key },
        { key: 'kind', header: 'Kind', render: (r) => r.kind },
        { key: 'sortOrder', header: 'Order', render: (r) => r.sortOrder },
        {
          key: 'enabled',
          header: 'Enabled',
          render: (r) => <CrudBadge label={r.enabled ? 'On' : 'Off'} tone={r.enabled ? 'green' : 'neutral'} />,
        },
      ]}
    />
  );
}
