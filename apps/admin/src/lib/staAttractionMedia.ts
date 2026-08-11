import { CONTENT_PIPELINE } from 'cavitour-shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadPlaceImage } from './destinationPlaces';

export type StaAttractionMedia = {
  description: string;
  images: string[];
  openingHours: string;
  closingHours: string;
  phone: string;
  email: string;
  website: string;
};

export type PersistStaMediaInput = {
  staId: string;
  description: string;
  images: string[];
  fileByBlobUrl: Map<string, File>;
  openingHours: string;
  closingHours: string;
  phone: string;
  email: string;
  website: string;
};

function fold(s: string): string {
  return s.trim().toLowerCase();
}

/** Parse "HH:MM" or "HH:MM:SS" → Postgres TIME string, or null. */
export function parseTimeInput(v: string | null | undefined): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = m[3] != null ? Number(m[3]) : 0;
  if (hh > 23 || mm > 59 || ss > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function formatTimeForInput(v: string | null | undefined): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  // Postgres may return "09:30:00" or "09:30:00+00"
  const m = s.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '';
}

export function collectGalleryImages(
  picture: string | null | undefined,
  galleryUrls: string[] | null | undefined
): string[] {
  const urls: string[] = [];
  if (picture?.trim()) urls.push(picture.trim());
  for (const u of galleryUrls ?? []) {
    const t = String(u ?? '').trim();
    if (t && !urls.includes(t)) urls.push(t);
  }
  return urls;
}

/** Load about/media/hours/contact from STA rows by id. */
export async function fetchAttractionMediaByStaIds(
  client: SupabaseClient,
  staIds: string[]
): Promise<Map<string, StaAttractionMedia>> {
  const unique = [...new Set(staIds.map((n) => n.trim()).filter(Boolean))];
  const map = new Map<string, StaAttractionMedia>();
  if (unique.length === 0) return map;

  const { data, error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .select('id, description, picture, gallery_urls, opening_hours, closing_hours, phone, email, website')
    .in('id', unique);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const id = String(row.id ?? '').trim();
    if (!id) continue;
    map.set(id, {
      description: String(row.description ?? ''),
      images: collectGalleryImages(row.picture, row.gallery_urls as string[] | null),
      openingHours: formatTimeForInput(row.opening_hours as string | null),
      closingHours: formatTimeForInput(row.closing_hours as string | null),
      phone: String(row.phone ?? ''),
      email: String(row.email ?? ''),
      website: String(row.website ?? ''),
    });
  }
  return map;
}

/** @deprecated name-based helper — prefer fetchAttractionMediaByStaIds */
export async function fetchAttractionMediaByNames(
  client: SupabaseClient,
  taNames: string[]
): Promise<Map<string, StaAttractionMedia & { taPublicId: string | null }>> {
  const unique = [...new Set(taNames.map((n) => n.trim()).filter(Boolean))];
  const map = new Map<string, StaAttractionMedia & { taPublicId: string | null }>();
  if (unique.length === 0) return map;

  const { data, error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .select('id, ta_name, description, picture, gallery_urls, opening_hours, closing_hours, phone, email, website');

  if (error) throw new Error(error.message);

  const wanted = new Set(unique.map(fold));
  for (const row of data ?? []) {
    const name = String(row.ta_name ?? '').trim();
    if (!name || !wanted.has(fold(name))) continue;
    map.set(fold(name), {
      description: String(row.description ?? ''),
      images: collectGalleryImages(row.picture, row.gallery_urls as string[] | null),
      openingHours: formatTimeForInput(row.opening_hours as string | null),
      closingHours: formatTimeForInput(row.closing_hours as string | null),
      phone: String(row.phone ?? ''),
      email: String(row.email ?? ''),
      website: String(row.website ?? ''),
      taPublicId: String(row.id ?? '') || null,
    });
  }
  return map;
}

/**
 * Persist About + gallery + hours + contact on sta_v3_cavite_2025.
 */
export async function persistStaAboutAndMedia(
  client: SupabaseClient,
  input: PersistStaMediaInput
): Promise<void> {
  const staId = input.staId.trim();
  if (!staId) throw new Error('STA id is required for About / images');

  const out: string[] = [];
  for (const url of input.images) {
    if (url.startsWith('blob:')) {
      const file = input.fileByBlobUrl.get(url);
      if (file) out.push(await uploadPlaceImage(client, staId, file));
    } else if (url.trim()) {
      out.push(url.trim());
    }
  }

  const { error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .update({
      description: input.description.trim() || null,
      gallery_urls: out,
      picture: out[0] ?? null,
      opening_hours: parseTimeInput(input.openingHours),
      closing_hours: parseTimeInput(input.closingHours),
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
      website: input.website.trim() || null,
    })
    .eq('id', staId);

  if (error) throw new Error(error.message);
}

/** @deprecated use persistStaAboutAndMedia */
export async function upsertAttractionAboutAndMedia(
  client: SupabaseClient,
  input: {
    existingPublicId: string | null;
    description: string;
    images: string[];
    fileByBlobUrl: Map<string, File>;
    openingHours?: string;
    closingHours?: string;
    phone?: string;
    email?: string;
    website?: string;
    ta_name?: string;
  }
): Promise<string> {
  const staId = String(input.existingPublicId ?? '').trim();
  if (!staId) throw new Error('STA id is required');
  await persistStaAboutAndMedia(client, {
    staId,
    description: input.description,
    images: input.images,
    fileByBlobUrl: input.fileByBlobUrl,
    openingHours: input.openingHours ?? '',
    closingHours: input.closingHours ?? '',
    phone: input.phone ?? '',
    email: input.email ?? '',
    website: input.website ?? '',
  });
  return staId;
}
