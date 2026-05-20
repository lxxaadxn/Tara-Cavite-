/** Light line icons for category filter cards. */

export function FilterCategoryIcon({ name, selected = false }) {
  const stroke = selected ? '#7EA00E' : '#9ca3af';
  const props = {
    className: 'h-9 w-9',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.15,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    vectorEffect: 'non-scaling-stroke',
    'aria-hidden': true,
  };

  switch (name) {
    case 'nature':
      return (
        <svg {...props}>
          <path d="M12 3c-2 4-5.5 5-5.5 9.5a5.5 5.5 0 1011 0C18.5 8 14 7 12 3z" />
        </svg>
      );
    case 'mice':
      return (
        <svg {...props}>
          <path d="M9.5 20h5M12 16V7M10 7h4" />
          <path d="M10.5 7V5h3v2" />
        </svg>
      );
    case 'restaurant':
      return (
        <svg {...props}>
          <path d="M9 4v7a3 3 0 006 0V4" />
          <path d="M12 11v9" />
        </svg>
      );
    case 'health':
      return (
        <svg {...props}>
          <path d="M4.5 14.5a7.5 7.5 0 0115 0" />
          <path d="M12 14.5V20" />
        </svg>
      );
    case 'cultural':
      return (
        <svg {...props}>
          <path d="M6.5 19V10.5L12 7l5.5 3.5V19" />
          <path d="M10 19v-3h4v3" />
        </svg>
      );
    case 'education':
      return (
        <svg {...props}>
          <path d="M5 9.5 12 5.5l7 4-7 4-7-4z" />
          <path d="M7 11.2v3.3c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-3.3" />
        </svg>
      );
    case 'leisure':
      return (
        <svg {...props}>
          <path d="M6 17.5l2-5.5 1.8 3 2-6 2 6 1.8-3 2 5.5H6z" />
        </svg>
      );
    case 'shopping':
      return (
        <svg {...props}>
          <path d="M8.5 9h7l-.8 9.5H9.3L8.5 9z" />
          <path d="M10 9V7a2 2 0 014 0v2" />
        </svg>
      );
    default:
      return null;
  }
}
