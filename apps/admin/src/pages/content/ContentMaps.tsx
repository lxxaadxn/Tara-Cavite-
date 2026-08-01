import { useState } from 'react';
import { ContentCrudPage, CrudBadge } from '../../components/ContentCrudPage';
import { mapLayers, type MapLayerRow } from '../../data/mockData';

const emptyForm: Omit<MapLayerRow, 'id'> = {
  layer: '',
  description: '',
  enabled: true,
  source: '',
};

export function ContentMaps() {
  const [rows, setRows] = useState(mapLayers);

  return (
    <ContentCrudPage<MapLayerRow>
      title="Maps"
      description="Map layers shown on commute and discovery maps (demo local state)."
      rows={rows}
      onChange={setRows}
      emptyForm={emptyForm}
      addLabel="Add layer"
      searchKeys={['layer', 'description', 'source']}
      statusFilter={{
        options: [
          { value: 'enabled', label: 'Enabled' },
          { value: 'disabled', label: 'Disabled' },
        ],
        match: (row, value) => (value === 'enabled' ? row.enabled : !row.enabled),
      }}
      fields={[
        { key: 'layer', label: 'Layer name', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'source', label: 'Source' },
        { key: 'enabled', label: 'Enabled', type: 'checkbox' },
      ]}
      columns={[
        { key: 'layer', header: 'Layer', render: (r) => <strong>{r.layer}</strong> },
        { key: 'description', header: 'Description', render: (r) => r.description },
        { key: 'source', header: 'Source', render: (r) => r.source },
        {
          key: 'enabled',
          header: 'Enabled',
          render: (r) => <CrudBadge label={r.enabled ? 'On' : 'Off'} tone={r.enabled ? 'green' : 'neutral'} />,
        },
      ]}
    />
  );
}
