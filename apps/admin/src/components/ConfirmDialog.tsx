import { useEffect, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  confirmingLabel = 'Deleting…',
  cancelLabel = 'Cancel',
  confirming = false,
  error = null,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirming) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, confirming, onCancel]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        if (!confirming) onCancel();
      }}
    >
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.icon} aria-hidden>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </div>
        <h2 id="admin-confirm-title" className={styles.title}>
          {title}
        </h2>
        <p id="admin-confirm-desc" className={styles.message}>
          {message}
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
