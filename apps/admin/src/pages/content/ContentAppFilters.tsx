import { useCallback, useEffect, useState } from 'react';
import { shortLabelForNtdpCategory } from 'cavitour-shared/ntdpFilterMeta';
import { ContentCrudPage, CrudBadge } from '../../components/ContentCrudPage';
import {
  createFilterLookup,
  deleteFilterLookup,
  fetchNtdpLookupRows,
  updateFilterLookup,
  type FilterLookupRow,
} from '../../lib/staFilterLookups';
import { supabase } from '../../lib/supabase';

type NtdpFilterCrud = {
  id: string;
  label: string;
  kind: 'ntdp';
};

const emptyForm: Omit<NtdpFilterCrud, 'id'> = {
  label: '',
  kind: 'ntdp',
};

function toCrudRow(row: FilterLookupRow): NtdpFilterCrud {
  return { id: row.id, label: row.label, kind: 'ntdp' };
}

/** Visitor Filter modal CATEGORY chips — same NTDP list as Tourist Attractions. */
export function ContentAppFilters() {
  const [rows, setRows] = useState<NtdpFilterCrud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNtdpLookupRows(supabase);
      setRows(data.map(toCrudRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load NTDP filters');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (form: Omit<NtdpFilterCrud, 'id'>) => {
    await createFilterLookup(supabase, { label: form.label, kind: 'ntdp' });
    await reload();
  };

  const handleUpdate = async (id: string, form: Omit<NtdpFilterCrud, 'id'>) => {
    await updateFilterLookup(supabase, id, { label: form.label, kind: 'ntdp' });
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteFilterLookup(supabase, id);
    await reload();
  };

  return (
    <ContentCrudPage<NtdpFilterCrud>
      title="Filters"
      rows={rows}
      loading={loading}
      error={error}
      emptyForm={emptyForm}
      addLabel="Add NTDP category"
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      searchKeys={['label']}
      fields={[
        {
          key: 'label',
          label: 'NTDP category',
          required: true,
          placeholder: 'e.g. Nature Tourism',
        },
      ]}
      columns={[
        {
          key: 'chip',
          header: 'Filter chip',
          render: (r) => <strong>{shortLabelForNtdpCategory(r.label)}</strong>,
        },
        { key: 'label', header: 'NTDP category', render: (r) => r.label },
        {
          key: 'icon',
          header: 'Icon',
          render: (r) => <CrudBadge label={r.label} tone="green" />,
        },
      ]}
    />
  );
}
