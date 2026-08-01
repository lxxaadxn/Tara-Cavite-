import { useState } from 'react';
import { ContentCrudPage, CrudBadge } from '../../components/ContentCrudPage';
import { terminals, type TerminalRow } from '../../data/mockData';

type ContentTerminal = {
  id: string;
  name: string;
  city: string;
  route: string;
  status: TerminalRow['status'];
};

const seed: ContentTerminal[] = terminals.map((t) => ({
  id: t.id,
  name: t.name,
  city: t.city,
  route: t.route,
  status: t.status,
}));

const emptyForm: Omit<ContentTerminal, 'id'> = {
  name: '',
  city: '',
  route: '',
  status: 'draft',
};

const STATUS_TONE: Record<ContentTerminal['status'], 'green' | 'amber' | 'neutral'> = {
  published: 'green',
  draft: 'amber',
  hidden: 'neutral',
};

export function ContentTerminals() {
  const [rows, setRows] = useState(seed);

  return (
    <ContentCrudPage<ContentTerminal>
      title="Terminals"
      description="Jeepney and bus terminals shown in commute guides (demo local state)."
      rows={rows}
      onChange={setRows}
      emptyForm={emptyForm}
      addLabel="Add terminal"
      searchKeys={['name', 'city', 'route']}
      statusFilter={{
        options: [
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' },
          { value: 'hidden', label: 'Hidden' },
        ],
        match: (row, value) => row.status === value,
      }}
      fields={[
        { key: 'name', label: 'Terminal name', required: true },
        { key: 'city', label: 'City / LGU', required: true },
        { key: 'route', label: 'Route', required: true },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'hidden', label: 'Hidden' },
          ],
        },
      ]}
      columns={[
        { key: 'name', header: 'Terminal', render: (r) => <strong>{r.name}</strong> },
        { key: 'city', header: 'City', render: (r) => r.city },
        { key: 'route', header: 'Route', render: (r) => r.route },
        {
          key: 'status',
          header: 'Status',
          render: (r) => <CrudBadge label={r.status} tone={STATUS_TONE[r.status]} />,
        },
      ]}
    />
  );
}
