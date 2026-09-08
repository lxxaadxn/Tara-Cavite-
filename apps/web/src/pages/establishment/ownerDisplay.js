/** Small display helpers shared by the establishment portal shell and its panels. */

export function ownerInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'E';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function defaultPlace(owner) {
  if (!owner) return '';
  if (owner.businessName && owner.lgu) return `${owner.businessName}, ${owner.lgu}`;
  return owner.businessName || owner.lgu || '';
}

function registeredOn(owner) {
  if (!owner?.setupCompletedAt) return '';
  const d = new Date(owner.setupCompletedAt);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * The owner's own record. `kind` decides whether a value is plain text or
 * something to act on, and `wide` marks the rows too long for one column.
 */
export const PROFILE_ROWS = [
  { label: 'Email', kind: 'email', value: (owner) => owner.email },
  { label: 'Contact person', kind: 'text', value: (owner) => owner.fullName },
  { label: 'Phone', kind: 'phone', value: (owner) => owner.phone },
  { label: 'Barangay / District', kind: 'text', value: (owner) => owner.barangay },
  { label: 'Registered', kind: 'text', value: registeredOn },
  { label: 'Address', kind: 'text', wide: true, value: (owner) => owner.address },
  { label: 'Map location', kind: 'link', wide: true, value: (owner) => owner.googleMapsLink },
];

export function recognitionLabel(status) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'suspended') return 'Suspended';
  if (status === 'invited') return 'Invited';
  return status || 'Pending';
}

/**
 * The three states the tourism office controls. Tones are names rather than
 * class names so this file stays free of styling.
 */
export function accountBadge(owner) {
  const status = owner?.accountStatus;
  if (status === 'disabled') return { label: 'Disabled', tone: 'red' };
  if (status === 'deleted') return { label: 'Removed', tone: 'red' };
  if (status === 'active') return { label: 'Active', tone: 'green' };
  return { label: status || 'Unknown', tone: 'neutral' };
}

export function recognitionBadge(owner) {
  const status = owner?.verificationStatus;
  const label = recognitionLabel(status);
  if (status === 'approved') return { label, tone: 'green' };
  if (status === 'rejected' || status === 'suspended') return { label, tone: 'red' };
  return { label, tone: 'amber' };
}

export function listingBadge(owner) {
  return owner?.publicVisible
    ? { label: 'Public', tone: 'green' }
    : { label: 'Hidden', tone: 'neutral' };
}
