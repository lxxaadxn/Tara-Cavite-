import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EXIT_MS = 320;
const SPARKLE_COUNT = 7;

function BookmarkFilledIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function sparkleOffset(index, total, radiusPx) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    '--sx': `${Math.cos(angle) * radiusPx}px`,
    '--sy': `${Math.sin(angle) * radiusPx}px`,
  };
}

/**
 * @param {Object} props
 * @param {string} props.listName
 * @param {'saved' | 'already'} [props.variant]
 * @param {() => void} [props.onDismiss]
 * @param {number} [props.durationMs]
 */
export function SaveSuccessToast({ listName, variant = 'saved', onDismiss, durationMs = 3000 }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const autoDismissRef = useRef(null);
  const exitCompleteRef = useRef(null);
  const isAlready = variant === 'already';

  const clearTimers = useCallback(() => {
    if (autoDismissRef.current) {
      window.clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
    if (exitCompleteRef.current) {
      window.clearTimeout(exitCompleteRef.current);
      exitCompleteRef.current = null;
    }
  }, []);

  const startExit = useCallback(() => {
    setExiting(true);
    exitCompleteRef.current = window.setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismiss?.();
    }, EXIT_MS);
  }, [onDismiss]);

  useEffect(() => {
    if (!listName) return undefined;
    clearTimers();
    setExiting(false);
    setVisible(false);
    const enterFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    autoDismissRef.current = window.setTimeout(startExit, durationMs);
    return () => {
      cancelAnimationFrame(enterFrame);
      clearTimers();
    };
  }, [listName, variant, durationMs, startExit, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!listName || typeof document === 'undefined') return null;

  const toastClass = [
    'save-success-toast',
    isAlready ? 'save-success-toast--already' : '',
    visible && !exiting ? 'save-success-toast--visible' : '',
    exiting ? 'save-success-toast--exiting' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[1300] flex justify-center px-4"
    >
      <ToastCard listName={listName} isAlready={isAlready} toastClass={toastClass} startExit={startExit} />
    </div>,
    document.body,
  );
}

function ToastCard({ listName, isAlready, toastClass, startExit }) {
  return (
    <div className="save-success-toast-wrap pointer-events-auto relative">
      <div className={toastClass}>
        <button
          type="button"
          onClick={startExit}
          className="absolute right-2 top-2 rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Dismiss notification"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {!isAlready ? (
          <div className="save-success-sparkles" aria-hidden>
            {Array.from({ length: SPARKLE_COUNT }).map((_, i) => (
              <span
                key={i}
                className="save-success-sparkle"
                style={{
                  ...sparkleOffset(i, SPARKLE_COUNT, 28),
                  animationDelay: `${i * 35}ms`,
                }}
              />
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2.5 pr-6">
          <BookmarkFilledIcon
            className={[
              'h-5 w-5 shrink-0',
              isAlready ? 'text-amber-600' : 'save-success-icon-pop text-[var(--cavitour-green)]',
            ]
              .filter(Boolean)
              .join(' ')}
          />
          <p className="text-sm text-neutral-700">
            {isAlready ? 'Already in' : 'Saved to'}{' '}
            <span className="font-semibold text-neutral-900">&ldquo;{listName}&rdquo;</span>
          </p>
        </div>
      </div>
    </div>
  );
}
