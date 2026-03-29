import type { Terminal } from '../data/mockData';

export function terminalAddressLine(t: Terminal): string {
  if (t.addressLine) return t.addressLine;
  if (t.municipality === 'Parañaque') return 'Tambo, Parañaque, Metro Manila';
  return `${t.municipality}, Cavite, Philippines`;
}
