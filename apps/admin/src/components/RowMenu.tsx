import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './RowMenu.module.css';

export type RowMenuItem = {
  label: string;
  onSelect: () => void;
  /** Renders in subtle red, for destructive actions like Deactivate. */
  danger?: boolean;
};

type Props = {
  items: RowMenuItem[];
  /** Accessible name for the trigger, e.g. "More actions for Acienda Outlet". */
  label: string;
};

const PANEL_WIDTH = 210;
const PANEL_GAP = 6;
const EDGE_PADDING = 12;

type PanelStyle = { top: number; left: number };

export function RowMenu({ items, label }: Props) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panel, setPanel] = useState<PanelStyle | null>(null);

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const height = Math.max(48, items.length * 40 + 12);
    const room = window.innerHeight - rect.bottom - PANEL_GAP - EDGE_PADDING;
    const top = room >= height ? rect.bottom + PANEL_GAP : Math.max(EDGE_PADDING, rect.top - PANEL_GAP - height);
    const left = Math.min(
      Math.max(EDGE_PADDING, rect.right - PANEL_WIDTH),
      window.innerWidth - PANEL_WIDTH - EDGE_PADDING
    );
    setPanel({ top, left });
  }, [items.length]);

  useLayoutEffect(() => {
    if (!open) return;
    position();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onViewportChange = () => position();
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    return () => {
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
  }, [open]);

  // Capture Escape first so it closes only this menu.
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [open]);

  const openMenu = (index = 0) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const run = (index: number) => {
    const item = items[index];
    if (!item) return;
    setOpen(false);
    triggerRef.current?.focus();
    item.onSelect();
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      run(activeIndex);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            openMenu(0);
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            openMenu(items.length - 1);
          }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {open && panel
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              className={styles.panel}
              role="menu"
              tabIndex={-1}
              style={{ top: panel.top, left: panel.left, width: PANEL_WIDTH }}
              onKeyDown={onListKeyDown}
            >
              {items.map((item, index) => (
                <li key={item.label} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.item} ${item.danger ? styles.itemDanger : ''} ${
                      index === activeIndex ? styles.itemActive : ''
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => run(index)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body
          )
        : null}
    </>
  );
}
