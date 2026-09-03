import { useCallback, useEffect, useState } from 'react';
import { ContentCrudPage } from '../../components/ContentCrudPage';
import {
  createFilterLookup,
  deleteFilterLookup,
  fetchFilterLookupRows,
  filterKindLabel,
  updateFilterLookup,
  type FilterLookupKind,
  type FilterLookupRow,
} from '../../lib/staFilterLookups';
import { supabase } from '../../lib/supabase';

type CategoryCrudRow = {
  id: string;
  label: string;
  kind: FilterLookupKind;
};

const emptyForm: Omit<CategoryCrudRow, 'id'> = {
  label: '',
  kind: 'ntdp',
};

function toCrudRow(row: FilterLookupRow): CategoryCrudRow {
  return { id: row.id, label: row.label, kind: row.kind };
}

/** STA lookup tables: NTDP / TA category / type code. */
export function ContentCategories() {
  const [rows, setRows] = useState<CategoryCrudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFilterLookupRows(supabase);
      setRows(data.map(toCrudRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (form: Omit<CategoryCrudRow, 'id'>) => {
    await createFilterLookup(supabase, form);
    await reload();
  };

  const handleUpdate = async (id: string, form: Omit<CategoryCrudRow, 'id'>) => {
    await updateFilterLookup(supabase, id, form);
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteFilterLookup(supabase, id);
    await reload();
  };

  return (
    <ContentCrudPage<CategoryCrudRow>
      title="Categories"
      rows={rows}
      loading={loading}
      error={error}
      emptyForm={emptyForm}
      addLabel="Add category"
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      searchKeys={['label', 'kind']}
      statusFilter={{
        options: [
          { value: 'ntdp', label: 'NTDP category' },
          { value: 'ta', label: 'TA category' },
          { value: 'type', label: 'Type code' },
        ],
        match: (row, value) => row.kind === value,
      }}
      fields={[
        { key: 'label', label: 'Label', required: true },
        {
          key: 'kind',
          label: 'Kind',
          type: 'select',
          options: [
            { value: 'ntdp', label: 'NTDP category' },
            { value: 'ta', label: 'TA category' },
            { value: 'type', label: 'Type code' },
          ],
        },
      ]}
      columns={[
        { key: 'label', header: 'Label', render: (r) => <strong>{r.label}</strong> },
        { key: 'kind', header: 'Kind', render: (r) => filterKindLabel(r.kind) },
      ]}
    />
  );
}
