import { useEffect, useState } from 'react';
import { fetchAdminItineraries } from '../../lib/adminItineraries';
import { fetchAdminDestinations } from '../../lib/destinationPlaces';
import { supabase } from '../../lib/supabase';
import { LandingCatalogPicker, type CatalogPickOption } from './LandingCatalogPicker';
import { SiteContentEditor } from './SiteContentEditor';

export function LandingDestinationsPickAdmin({ embedded = false }: { embedded?: boolean }) {
  const [options, setOptions] = useState<CatalogPickOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminDestinations(supabase)
      .then((list) => {
        if (!active) return;
        setOptions(
          list
            .filter((row) => row.is_published !== false)
            .map((row) => ({
              id: row.establishment_public_id,
              title: row.ta_name,
              subtitle: [row.city_mun, row.ntdp_category || row.type].filter(Boolean).join(' · '),
            }))
        );
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setOptions([]);
        setError(e instanceof Error ? e.message : 'Could not load establishments');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <LandingCatalogPicker
      contentKey="landing.destinations.place_ids"
      heading="Selected destinations"
      searchLabel="Search establishments"
      searchPlaceholder="Search by name or city…"
      emptyLabel="No destinations selected"
      nameHeader="Establishment"
      detailHeader="Location"
      options={options}
      loading={loading}
      error={error}
      embedded={embedded}
    />
  );
}

export function LandingItinerariesPickAdmin({ embedded = false }: { embedded?: boolean }) {
  const [options, setOptions] = useState<CatalogPickOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminItineraries()
      .then((list) => {
        if (!active) return;
        setOptions(
          list
            .filter((row) => row.status === 'published')
            .map((row) => ({
              id: row.id,
              title: row.title,
              subtitle: row.route || row.subtitle || '',
            }))
        );
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setOptions([]);
        setError(e instanceof Error ? e.message : 'Could not load itineraries');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <LandingCatalogPicker
      contentKey="landing.trails.itinerary_ids"
      heading="Selected itineraries"
      searchLabel="Search itineraries"
      searchPlaceholder="Search by title or route…"
      emptyLabel="No itineraries selected"
      nameHeader="Itinerary"
      detailHeader="Route"
      options={options}
      loading={loading}
      error={error}
      embedded={embedded}
    />
  );
}

export function LandingDestinationsCatalogAdmin() {
  return (
    <SiteContentEditor
      folder="landing"
      layout="twoColumn"
      fields={[
        { key: 'landing.destinations.heading', label: 'Destinations heading', type: 'textarea', compact: true },
        { key: 'landing.destinations.body', label: 'Destinations body', type: 'textarea', compact: true },
      ]}
    >
      <LandingDestinationsPickAdmin embedded />
    </SiteContentEditor>
  );
}

export function LandingItinerariesCatalogAdmin() {
  return (
    <SiteContentEditor
      folder="landing"
      layout="twoColumn"
      fields={[
        { key: 'landing.trails.heading', label: 'Itineraries heading', type: 'textarea', compact: true },
        { key: 'landing.trails.body', label: 'Itineraries body', type: 'textarea', compact: true },
      ]}
    >
      <LandingItinerariesPickAdmin embedded />
    </SiteContentEditor>
  );
}
