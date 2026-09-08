import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './SelectMenu.module.css';

export type SelectMenuOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Labels the trigger when no visible <label> wraps it. */
  ariaLabel?: string;
  /** Ties the trigger to a visible label element. */
  labelledBy?: string;
};

const PANEL_MAX_HEIGHT = 264;
const PANEL_GAP = 6;
const TYPEAHEAD_RESET_MS = 700;

type PanelStyle = { top: number; left: number; width: number; maxHeight: number };

export function SelectMenu({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  ariaLabel,
  labelledBy,
}: Props) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const typed = useRef({ text: '', at: 0 });

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panel, setPanel] = useState<PanelStyle | null>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - PANEL_GAP - 8;
    const above = rect.top - PANEL_GAP - 8;
    const dropDown = below >= Math.min(PANEL_MAX_HEIGHT, above) || below >= 180;
    const maxHeight = Math.min(PANEL_MAX_HEIGHT, Math.max(120, dropDown ? below : above));
    setPanel({
      top: dropDown ? rect.bottom + PANEL_GAP : rect.top - PANEL_GAP - maxHeight,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, []);

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

  // Capture Escape before the surrounding modal sees it, so the first press
  // only closes this menu.
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

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const openMenu = (index?: number) => {
    if (disabled) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(index ?? (selectedIndex >= 0 ? selectedIndex : 0));
    setOpen(true);
  };

  const closeMenu = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const pick = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    closeMenu();
  };

  const jumpToTyped = (key: string) => {
    const now = Date.now();
    const text = (now - typed.current.at < TYPEAHEAD_RESET_MS ? typed.current.text : '') + key.toLowerCase();
    typed.current = { text, at: now };
    const index = options.findIndex((option) => option.label.toLowerCase().startsWith(text));
    if (index < 0) return;
    if (open) setActiveIndex(index);
    else onChange(options[index].value);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu();
      return;
    }
    if (e.key.length === 1 && /\S/.test(e.key)) jumpToTyped(e.key);
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(activeIndex);
      return;
    }
    if (e.key.length === 1 && /\S/.test(e.key)) jumpToTyped(e.key);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={selected ? styles.value : styles.placeholder}>{selected?.label ?? placeholder}</span>
        <svg
          className={styles.chevron}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && panel
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              className={styles.panel}
              role="listbox"
              tabIndex={-1}
              aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
              style={{
                top: panel.top,
                left: panel.left,
                width: panel.width,
                maxHeight: panel.maxHeight,
              }}
              onKeyDown={onListKeyDown}
            >
              {options.length === 0 ? (
                <li className={styles.empty}>No options available</li>
              ) : (
                options.map((option, index) => {
                  const isSelected = option.value === value;
                  return (
                    <li
                      key={option.value}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      className={`${styles.option} ${index === activeIndex ? styles.optionActive : ''} ${
                        isSelected ? styles.optionSelected : ''
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => pick(index)}
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>,
            document.body
          )
        : null}
    </>
  );
}
