import { useCallback, useEffect, useState } from 'react';
import { ContentCrudPage, CrudBadge } from '../../components/ContentCrudPage';
import {
  announcementDateLabel,
  createAnnouncementAdmin,
  deleteAnnouncementAdmin,
  fetchAnnouncementsAdmin,
  updateAnnouncementAdmin,
  type AnnouncementAdminRow,
} from '../../lib/adminAnnouncements';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type AnnouncementForm = Omit<AnnouncementAdminRow, 'id'>;

const emptyForm: AnnouncementForm = {
  kind: 'event',
  title: '',
  place: '',
  body: '',
  source: 'admin',
  is_published: true,
  published_at: null,
};

export function ContentAnnouncements() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AnnouncementAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAnnouncementsAdmin(supabase));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load announcements');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (form: AnnouncementForm) => {
    const authorId = session?.user?.id;
    if (!authorId) throw new Error('Sign in to post an announcement');
    await createAnnouncementAdmin(supabase, form, authorId);
    await reload();
  };

  const handleUpdate = async (id: string, form: AnnouncementForm) => {
    await updateAnnouncementAdmin(supabase, id, form);
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteAnnouncementAdmin(supabase, id);
    await reload();
  };

  return (
    <ContentCrudPage<AnnouncementAdminRow>
      title="Announcements"
      rows={rows}
      loading={loading}
      error={error}
      emptyForm={emptyForm}
      addLabel="Add announcement"
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      searchKeys={['title', 'place', 'body', 'kind']}
      statusFilter={{
        options: [
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Unpublished' },
        ],
        match: (row, value) => (value === 'published' ? row.is_published : !row.is_published),
      }}
      fields={[
        { key: 'title', label: 'Title', required: true, placeholder: 'e.g. Amadeo Coffee Weekend' },
        {
          key: 'kind',
          label: 'Kind',
          type: 'select',
          options: [
            { value: 'event', label: 'Event' },
            { value: 'advisory', label: 'Advisory' },
          ],
        },
        { key: 'place', label: 'Place', required: true, placeholder: 'City or corridor' },
        {
          key: 'body',
          label: 'Details',
          type: 'textarea',
          required: true,
          placeholder: 'What travelers should know',
        },
        { key: 'is_published', label: 'Published (visible to travelers)', type: 'checkbox' },
      ]}
      columns={[
        { key: 'title', header: 'Title', render: (r) => <strong>{r.title}</strong> },
        {
          key: 'kind',
          header: 'Kind',
          render: (r) => (
            <CrudBadge label={r.kind === 'advisory' ? 'Advisory' : 'Event'} tone={r.kind === 'advisory' ? 'amber' : 'green'} />
          ),
        },
        { key: 'place', header: 'Place', render: (r) => r.place },
        {
          key: 'source',
          header: 'From',
          render: (r) => (r.source === 'establishment' ? 'Establishment' : 'Admin'),
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <CrudBadge label={r.is_published ? 'Published' : 'Unpublished'} tone={r.is_published ? 'green' : 'neutral'} />
          ),
        },
        {
          key: 'when',
          header: 'Posted',
          render: (r) => announcementDateLabel(r.published_at) || '—',
        },
      ]}
    />
  );
}
