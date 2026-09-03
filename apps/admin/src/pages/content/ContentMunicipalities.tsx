import { useCallback, useEffect, useState } from 'react';
import { ContentCrudPage } from '../../components/ContentCrudPage';
import {
  createCity,
  deleteCity,
  fetchCitiesAdmin,
  updateCity,
  type CityAdminRow,
  type LguKind,
} from '../../lib/staCitiesAdmin';
import { supabase } from '../../lib/supabase';

const COPY: Record<
  LguKind,
  { title: string; addLabel: string; placeholder: string; loadError: string }
> = {
  city: {
    title: 'Cities',
    addLabel: 'Add city',
    placeholder: 'e.g. Bacoor City',
    loadError: 'Failed to load cities',
  },
  municipality: {
    title: 'Municipalities',
    addLabel: 'Add municipality',
    placeholder: 'e.g. Silang',
    loadError: 'Failed to load municipalities',
  },
};

function ContentLguPage({ kind }: { kind: LguKind }) {
  const copy = COPY[kind];
  const emptyForm: Omit<CityAdminRow, 'id'> = { name: '', kind };
  const [rows, setRows] = useState<CityAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchCitiesAdmin(supabase, { kind }));
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.loadError);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, kind]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (form: Omit<CityAdminRow, 'id'>) => {
    await createCity(supabase, { name: form.name, kind });
    await reload();
  };

  const handleUpdate = async (id: string, form: Omit<CityAdminRow, 'id'>) => {
    await updateCity(supabase, id, { name: form.name, kind });
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteCity(supabase, id);
    await reload();
  };

  return (
    <ContentCrudPage<CityAdminRow>
      title={copy.title}
      rows={rows}
      loading={loading}
      error={error}
      emptyForm={emptyForm}
      addLabel={copy.addLabel}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      toForm={(row) => ({ name: row.name, kind })}
      searchKeys={['name']}
      fields={[{ key: 'name', label: 'Name', required: true, placeholder: copy.placeholder }]}
      columns={[
        { key: 'name', header: 'Name', render: (r) => <strong>{r.name}</strong> },
        { key: 'id', header: 'ID', render: (r) => r.id },
      ]}
    />
  );
}

export function ContentCities() {
  return <ContentLguPage kind="city" />;
}

export function ContentMunicipalities() {
  return <ContentLguPage kind="municipality" />;
}
