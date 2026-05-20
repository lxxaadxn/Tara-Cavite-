function normalizeToken(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Strip duplicate name / barangay noise for map and list cards. */
export function sanitizeAddress(address: string | undefined, placeName = ''): string {
  if (!address) return 'Cavite, Philippines';
  const normalizedName = normalizeToken(placeName);
  const parts = address.split(',').map((part) => part.trim());
  const cleanedParts = parts.filter((part, idx) => {
    if (!part) return false;
    if (/^sta\.?/i.test(part) || /^brgy\.?/i.test(part) || /^barangay/i.test(part)) return false;
    if (idx === 0 && normalizedName) {
      const normalizedPart = normalizeToken(part);
      if (
        normalizedPart === normalizedName ||
        normalizedPart.includes(normalizedName) ||
        normalizedName.includes(normalizedPart)
      ) {
        return false;
      }
    }
    return true;
  });
  return cleanedParts.length ? cleanedParts.join(', ') : address;
}
