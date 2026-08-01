/**
 * Upload bundled establishment PNGs to Supabase Storage and save URLs on
 * public.tourist_attractions (picture + gallery_urls).
 *
 * Matches local files by ta_name via parseLocalEstablishmentMedia.
 *
 * Usage:
 *   node scripts/upload-local-establishment-images.mjs
 *   node scripts/upload-local-establishment-images.mjs --apply
 *   node scripts/upload-local-establishment-images.mjs --apply --force
 *
 * Env (optional .env at repo root):
 *   SUPABASE_URL — defaults to project URL
 *   SUPABASE_SERVICE_ROLE_KEY — required for --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  ESTABLISHMENTS_DIR,
  lookupLocalMedia,
  parseLocalEstablishmentMedia,
  resolveLocalImagePaths,
} from './lib/parseLocalEstablishmentMedia.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_URL = 'https://bmsftpvixpvtjrlclnlz.supabase.co';
const BUCKET = 'place-images';
const CATALOG_TABLE = 'tourist_attractions';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const FORCE = args.has('--force');

function loadDotEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function foldName(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function fetchAllRows(client, table, select, pageSize = 1000) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client.from(table).select(select).range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function uploadGallery(client, placeId, filenames) {
  const paths = resolveLocalImagePaths(filenames);
  const publicUrls = [];

  for (const filePath of paths) {
    const base = path.basename(filePath);
    const storagePath = `${placeId}/${base}`;
    const body = fs.readFileSync(filePath);
    const { error } = await client.storage.from(BUCKET).upload(storagePath, body, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw new Error(`upload ${storagePath}: ${error.message}`);
    const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
    publicUrls.push(data.publicUrl);
  }

  return publicUrls;
}

async function main() {
  loadDotEnv();

  const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc2Z0cHZpeHB2dGpybGNsbmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzg1NDEsImV4cCI6MjA4NjYxNDU0MX0.ZEefnXcvDxxwaSEnsBvUxhxZar-V6M1v8F2_-kZRJkc';

  const client = createClient(supabaseUrl, APPLY ? serviceKey : anonKey);

  if (APPLY && !serviceKey) {
    console.error('FAIL: SUPABASE_SERVICE_ROLE_KEY is required for --apply');
    console.error('Add it to .env (repo root) or export it in your shell.');
    process.exit(1);
  }

  if (!fs.existsSync(ESTABLISHMENTS_DIR)) {
    console.error('FAIL: missing', ESTABLISHMENTS_DIR);
    process.exit(1);
  }

  const localMedia = parseLocalEstablishmentMedia();
  console.log(`Local bundled establishments: ${localMedia.size}`);

  const catalog = await fetchAllRows(
    client,
    CATALOG_TABLE,
    'establishment_public_id, ta_name, picture, gallery_urls'
  );
  console.log(`public.${CATALOG_TABLE} rows: ${catalog.length}`);

  if (!catalog.length) {
    console.error(`FAIL: ${CATALOG_TABLE} is empty — nothing to attach images to.`);
    process.exit(1);
  }

  const byName = new Map();
  for (const row of catalog) {
    byName.set(foldName(row.ta_name), row);
  }

  const plan = [];
  const skipped = { noLocal: 0, noRow: 0, hasImage: 0 };

  // Prefer matching every catalog row that has local media
  for (const row of catalog) {
    const files = lookupLocalMedia(localMedia, row.ta_name);
    if (!files?.length) {
      skipped.noLocal++;
      continue;
    }

    const hasImage =
      Boolean(row.picture?.trim()) ||
      (Array.isArray(row.gallery_urls) && row.gallery_urls.length > 0);
    if (hasImage && !FORCE) {
      skipped.hasImage++;
      continue;
    }

    plan.push({
      taName: row.ta_name,
      placeId: row.establishment_public_id,
      placeName: row.ta_name,
      files,
    });
  }

  // Also try local-only names that fold-match catalog (covers spelling variants)
  for (const taName of localMedia.keys()) {
    if (plan.some((p) => foldName(p.taName) === foldName(taName))) continue;
    const row = byName.get(foldName(taName));
    if (!row) {
      skipped.noRow++;
      continue;
    }
    const files = lookupLocalMedia(localMedia, taName);
    if (!files?.length) continue;
    const hasImage =
      Boolean(row.picture?.trim()) ||
      (Array.isArray(row.gallery_urls) && row.gallery_urls.length > 0);
    if (hasImage && !FORCE) {
      skipped.hasImage++;
      continue;
    }
    plan.push({
      taName,
      placeId: row.establishment_public_id,
      placeName: row.ta_name,
      files,
    });
  }

  console.log('\nPlan summary:');
  console.log(`  upload: ${plan.length}`);
  console.log(`  skip (no local images): ${skipped.noLocal}`);
  console.log(`  skip (local name not in catalog): ${skipped.noRow}`);
  console.log(`  skip (already has images${FORCE ? ', --force ignores' : ''}): ${skipped.hasImage}`);

  if (!plan.length) {
    console.log('\nNothing to upload.');
    return;
  }

  console.log('\nSample uploads:');
  for (const row of plan.slice(0, 5)) {
    console.log(`  ${row.placeName} → ${row.files.length} file(s)`);
  }

  if (!APPLY) {
    console.log(`\nDry run only. Re-run with --apply to upload and update public.${CATALOG_TABLE}.`);
    return;
  }

  let ok = 0;
  let failed = 0;

  for (const row of plan) {
    try {
      const publicUrls = await uploadGallery(client, row.placeId, row.files);
      const { error } = await client
        .from(CATALOG_TABLE)
        .update({
          picture: publicUrls[0] ?? null,
          gallery_urls: publicUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('establishment_public_id', row.placeId);
      if (error) throw new Error(error.message);
      ok++;
      console.log(`OK  ${row.placeName} (${publicUrls.length} images)`);
    } catch (err) {
      failed++;
      console.error(`ERR ${row.placeName}:`, err.message);
    }
  }

  console.log(`\nDone. Updated ${ok}, failed ${failed}.`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
