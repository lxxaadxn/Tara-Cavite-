import React, { useMemo } from 'react';

type IconId = 'calendar' | 'map' | 'route' | 'pin' | 'info' | 'car';

function IconCalendar() {
  return (
    <svg
      className="ft-icon ft-icon--calendar"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 3v2M16 3v2M4.5 8.5h15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.5 5h11a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMap() {
  return (
    <svg className="ft-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 18 3.5 20V6l5.5-2 6 2 5.5-2v14L15 20l-6-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconRoute() {
  return (
    <svg className="ft-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 18c3-6 9-6 12-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 18h-1a2 2 0 0 1-2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 6h1a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="6" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg className="ft-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 0 0-14 0c0 6.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg className="ft-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 7h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconCar() {
  return (
    <svg className="ft-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 16l1-6 2-3h12l2 3 1 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M5 16h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7.5" cy="16.5" r="1.6" stroke="currentColor" strokeWidth="2" />
      <circle cx="16.5" cy="16.5" r="1.6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const ICONS: Array<{ id: IconId; render: () => JSX.Element }> = [
  { id: 'calendar', render: () => <IconCalendar /> },
  { id: 'map', render: () => <IconMap /> },
  { id: 'route', render: () => <IconRoute /> },
  { id: 'pin', render: () => <IconPin /> },
  { id: 'info', render: () => <IconInfo /> },
  { id: 'car', render: () => <IconCar /> },
];

export function RandomIcon({ className }: { className?: string }) {
  const chosen = useMemo(() => {
    return ICONS[Math.floor(Math.random() * ICONS.length)];
  }, []);

  return <span className={className ?? ''}>{chosen.render()}</span>;
}

