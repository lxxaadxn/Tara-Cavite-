/**
 * Parse apps/web/src/lib/establishmentLocalImages.js → name → PNG filenames.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SOURCE_FILE = path.join(REPO_ROOT, 'apps/web/src/lib/establishmentLocalImages.js');
export const ESTABLISHMENTS_DIR = path.join(REPO_ROOT, 'apps/web/public/establishments');

/** @returns {Map<string, string[]>} galleryVarName → filenames */
function parseGalleryVars(source) {
  const galleries = new Map();
  const re = /const\s+(\w+)\s*=\s*\[([\s\S]*?)\];/g;
  for (const match of source.matchAll(re)) {
    const varName = match[1];
    const body = match[2];
    const files = [...body.matchAll(/u\('([^']+)'\)/g)].map((m) => m[1]);
    if (files.length) galleries.set(varName, files);
  }
  return galleries;
}

/** @returns {Map<string, string[]>} establishment display name → filenames */
export function parseLocalEstablishmentMedia(sourcePath = SOURCE_FILE) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const galleries = parseGalleryVars(source);

  const blockMatch = source.match(/const LOCAL_MEDIA = \{([\s\S]*?)\n\};/);
  if (!blockMatch) throw new Error('LOCAL_MEDIA block not found in establishmentLocalImages.js');

  const media = new Map();
  const entryRe = /^\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"|([\w]+))\s*:\s*(\w+)\s*,?\s*$/gm;
  for (const match of blockMatch[1].matchAll(entryRe)) {
    const name = (match[1] ?? match[2] ?? match[3] ?? '').replace(/\\'/g, "'");
    const galleryVar = match[4];
    const files = galleries.get(galleryVar);
    if (!name || !files?.length) continue;
    media.set(name, files);
  }

  return media;
}

export function lookupLocalMedia(mediaMap, taName) {
  const raw = String(taName ?? '').trim();
  if (!raw) return undefined;
  if (mediaMap.has(raw)) return mediaMap.get(raw);
  const key = [...mediaMap.keys()].find((k) => k.toLowerCase() === raw.toLowerCase());
  return key ? mediaMap.get(key) : undefined;
}

export function resolveLocalImagePaths(filenames) {
  return filenames.map((file) => {
    const full = path.join(ESTABLISHMENTS_DIR, file);
    if (!fs.existsSync(full)) throw new Error(`Missing local image: ${full}`);
    return full;
  });
}
