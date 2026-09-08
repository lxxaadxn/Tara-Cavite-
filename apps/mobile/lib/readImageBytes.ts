import * as FileSystem from 'expo-file-system/legacy';

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < BASE64_ALPHABET.length; i += 1) {
    table[BASE64_ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Padding and any stray whitespace drop out, so the character count alone
  // gives the byte count: every 4 characters carry 3 bytes.
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);

  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const chunk =
      (BASE64_LOOKUP[clean.charCodeAt(i)] << 18) |
      (BASE64_LOOKUP[clean.charCodeAt(i + 1)] << 12) |
      (BASE64_LOOKUP[clean.charCodeAt(i + 2)] << 6) |
      BASE64_LOOKUP[clean.charCodeAt(i + 3)];

    if (byteIndex < byteLength) bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (byteIndex < byteLength) bytes[byteIndex++] = (chunk >> 8) & 0xff;
    if (byteIndex < byteLength) bytes[byteIndex++] = chunk & 0xff;
  }

  return bytes.buffer;
}

/**
 * Reads a local image (an `expo-image-picker` `file://`/`content://` uri) into
 * bytes for Supabase Storage. `fetch()` cannot read those uris on Android, so
 * this goes through the file system and decodes the base64 payload by hand —
 * Hermes has no dependable `atob`.
 */
export async function readLocalImageBytes(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64) throw new Error('The selected image is empty.');
  const buffer = base64ToArrayBuffer(base64);
  if (!buffer.byteLength) throw new Error('The selected image is empty.');
  return buffer;
}

/** jpg/png/webp from the picker uri, defaulting to jpg. */
export function imageExtensionFromUri(uri: string): 'jpg' | 'png' | 'webp' {
  const raw = (uri.split('.').pop() ?? '').split('?')[0].toLowerCase();
  if (raw === 'png') return 'png';
  if (raw === 'webp') return 'webp';
  return 'jpg';
}

export function imageMimeType(ext: 'jpg' | 'png' | 'webp', fallback?: string | null): string {
  if (fallback?.startsWith('image/')) return fallback;
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}
