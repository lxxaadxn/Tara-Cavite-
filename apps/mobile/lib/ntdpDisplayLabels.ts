/**
 * NTDP inventory text sometimes used the typo "Leasure" (source PDFs). Normalize for UI.
 */
export function normalizeNtdpCopy(text: string): string {
  return text.replace(/\bLeasure\b/g, 'Leisure');
}

/**
 * Tag label on About Establishment: correct spelling and show "Leisure and Entertainment"
 * without truncating (drops trailing " Tourism" for this category only).
 */
export function formatNtdpCategoryTagLabel(raw: string): string {
  const s = normalizeNtdpCopy(raw.trim());
  if (/^Leisure and Entertainment Tourism$/i.test(s)) {
    return 'Leisure and Entertainment';
  }
  return s;
}
