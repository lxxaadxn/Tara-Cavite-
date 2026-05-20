import { Alert } from 'react-native';
import { formatNtdpCategoryTagLabel } from './ntdpDisplayLabels';

export const SAVE_TO_LIST_CREATE_BUSY_ID = '__create__';

export function suggestedSaveListName(ntdpCategory?: string | null): string {
  const raw = ntdpCategory?.trim();
  if (raw) return formatNtdpCategoryTagLabel(raw);
  return 'My list';
}

export function pluralCountLabel(count: number, label: string): string {
  if (count === 1) {
    return label.endsWith('s') ? label.slice(0, -1) : label;
  }
  return label;
}

type SaveResult =
  | { ok: true }
  | { ok: false; duplicate: boolean; message?: string };

export function alertAfterSaveToList(
  res: SaveResult,
  itemName: string,
  listName: string,
  onSuccess: () => void
): void {
  if (res.ok) {
    onSuccess();
    Alert.alert('Saved', `Added to “${listName}”.`);
    return;
  }
  if (res.duplicate) {
    onSuccess();
    Alert.alert('Already in list', `“${itemName}” is already in “${listName}”.`);
    return;
  }
  Alert.alert('Error', res.message ?? 'Could not save to this list.');
}
