import { useState } from 'react';
import { ContentCrudPage, CrudBadge } from '../../components/ContentCrudPage';
import { contentEstablishments, type ContentEstablishment } from '../../data/mockData';

const emptyForm: Omit<ContentEstablishment, 'id'> = {
  name: '',
  city: '',
  category: 'Cafe / Restaurant',
  status: 'draft',
  address: '',
};

const STATUS_TONE: Record<ContentEstablishment['status'], 'green' | 'amber' | 'neutral'> = {
  active: 'green',
  draft: 'amber',
  hidden: 'neutral',
};

export function ContentEstablishments() {
  const [rows, setRows] = useState(contentEstablishments);

  return (
    <ContentCrudPage<ContentEstablishment>
      title="Establishment"
      description="Manage tourism establishments in the catalog (demo local state)."
      rows={rows}
      onChange={setRows}
      emptyForm={emptyForm}
      addLabel="Add establishment"
      searchKeys={['name', 'city', 'category', 'address']}
      statusFilter={{
        options: [
          { value: 'active', label: 'Active' },
          { value: 'draft', label: 'Draft' },
          { value: 'hidden', label: 'Hidden' },
        ],
        match: (row, value) => row.status === value,
      }}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'city', label: 'City / LGU', required: true },
        {
          key: 'category',
          label: 'Category',
          type: 'select',
          options: [
            { value: 'Cafe / Restaurant', label: 'Cafe / Restaurant' },
            { value: 'Resort', label: 'Resort' },
            { value: 'Historical', label: 'Historical' },
            { value: 'Attraction', label: 'Attraction' },
            { value: 'Nature farm', label: 'Nature farm' },
          ],
        },
        { key: 'address', label: 'Address', type: 'textarea' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'draft', label: 'Draft' },
            { value: 'hidden', label: 'Hidden' },
          ],
        },
      ]}
      columns={[
        { key: 'name', header: 'Name', render: (r) => <strong>{r.name}</strong> },
        { key: 'city', header: 'City', render: (r) => r.city },
        { key: 'category', header: 'Category', render: (r) => r.category },
        { key: 'address', header: 'Address', render: (r) => r.address },
        {
          key: 'status',
          header: 'Status',
          render: (r) => <CrudBadge label={r.status} tone={STATUS_TONE[r.status]} />,
        },
      ]}
    />
  );
}
