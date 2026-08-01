import { useState } from 'react';
import { ContentCrudPage, CrudBadge } from '../../components/ContentCrudPage';
import { contentHighlights, type ContentHighlight } from '../../data/mockData';
import styles from './ContentOverview.module.css';

const emptyForm: Omit<ContentHighlight, 'id'> = {
  title: '',
  note: '',
  destination: '',
  status: 'draft',
};

export function ContentOverview() {
  const [rows, setRows] = useState(contentHighlights);

  const active = rows.filter((r) => r.status === 'active').length;

  return (
    <div>
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Highlights</span>
          <span className={styles.summaryValue}>{rows.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Active</span>
          <span className={styles.summaryValue}>{active}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Draft</span>
          <span className={styles.summaryValue}>{rows.length - active}</span>
        </div>
      </div>

      <ContentCrudPage<ContentHighlight>
        title="Overview"
        description="Catalog highlights shown on marketing surfaces. Edit featured destinations and notes."
        rows={rows}
        onChange={setRows}
        emptyForm={emptyForm}
        addLabel="Add highlight"
        searchKeys={['title', 'destination', 'note']}
        statusFilter={{
          options: [
            { value: 'active', label: 'Active' },
            { value: 'draft', label: 'Draft' },
          ],
          match: (row, value) => row.status === value,
        }}
        fields={[
          { key: 'title', label: 'Title', required: true },
          { key: 'destination', label: 'Featured destination', required: true },
          { key: 'note', label: 'Note', type: 'textarea' },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
            ],
          },
        ]}
        columns={[
          { key: 'title', header: 'Title', render: (r) => <strong>{r.title}</strong> },
          { key: 'destination', header: 'Destination', render: (r) => r.destination },
          { key: 'note', header: 'Note', render: (r) => r.note },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <CrudBadge label={r.status} tone={r.status === 'active' ? 'green' : 'amber'} />,
          },
        ]}
      />
    </div>
  );
}
