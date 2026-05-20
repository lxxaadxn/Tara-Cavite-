import { useCallback, useState } from 'react';

/**
 * Manages save-success toast visibility for detail pages.
 * @returns {{
 *   showSaveSuccess: (listName: string, options?: { variant?: 'saved' | 'already' }) => void,
 *   toastProps: { listName: string, variant: 'saved' | 'already', onDismiss: () => void },
 * }}
 */
export function useSaveSuccessToast() {
  const [listName, setListName] = useState('');
  const [variant, setVariant] = useState('saved');

  const onDismiss = useCallback(() => {
    setListName('');
    setVariant('saved');
  }, []);

  const showSaveSuccess = useCallback((name, options = {}) => {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) return;
    const nextVariant = options.variant === 'already' ? 'already' : 'saved';
    setListName('');
    setVariant(nextVariant);
    window.requestAnimationFrame(() => setListName(trimmed));
  }, []);

  return {
    showSaveSuccess,
    toastProps: { listName, variant, onDismiss },
  };
}
