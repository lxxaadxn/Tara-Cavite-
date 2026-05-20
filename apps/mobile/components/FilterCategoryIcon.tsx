import React from 'react';
import Svg, { Path } from 'react-native-svg';

type IconName =
  | 'nature'
  | 'mice'
  | 'restaurant'
  | 'health'
  | 'cultural'
  | 'education'
  | 'leisure'
  | 'shopping';

export function FilterCategoryIcon({
  name,
  selected = false,
}: {
  name: IconName;
  selected?: boolean;
}) {
  const stroke = selected ? '#7EA00E' : '#9ca3af';
  const props = {
    width: 36,
    height: 36,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
  };

  switch (name) {
    case 'nature':
      return (
        <Svg {...props}>
          <Path
            d="M12 3c-2 4-5.5 5-5.5 9.5a5.5 5.5 0 1011 0C18.5 8 14 7 12 3z"
            stroke={stroke}
            strokeWidth={1.15}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'mice':
      return (
        <Svg {...props}>
          <Path d="M9.5 20h5M12 16V7M10 7h4" stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
          <Path d="M10.5 7V5h3v2" stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
        </Svg>
      );
    case 'restaurant':
      return (
        <Svg {...props}>
          <Path d="M9 4v7a3 3 0 006 0V4" stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
          <Path d="M12 11v9" stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
        </Svg>
      );
    case 'health':
      return (
        <Svg {...props}>
          <Path d="M4.5 14.5a7.5 7.5 0 0115 0" stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
          <Path d="M12 14.5V20" stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
        </Svg>
      );
    case 'cultural':
      return (
        <Svg {...props}>
          <Path d="M6.5 19V10.5L12 7l5.5 3.5V19" stroke={stroke} strokeWidth={1.15} strokeLinejoin="round" />
          <Path d="M10 19v-3h4v3" stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
        </Svg>
      );
    case 'education':
      return (
        <Svg {...props}>
          <Path d="M5 9.5 12 5.5l7 4-7 4-7-4z" stroke={stroke} strokeWidth={1.15} strokeLinejoin="round" />
          <Path d="M7 11.2v3.3c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-3.3" stroke={stroke} strokeWidth={1.15} />
        </Svg>
      );
    case 'leisure':
      return (
        <Svg {...props}>
          <Path d="M6 17.5l2-5.5 1.8 3 2-6 2 6 1.8-3 2 5.5H6z" stroke={stroke} strokeWidth={1.15} strokeLinejoin="round" />
        </Svg>
      );
    case 'shopping':
      return (
        <Svg {...props}>
          <Path d="M8.5 9h7l-.8 9.5H9.3L8.5 9z" stroke={stroke} strokeWidth={1.15} strokeLinejoin="round" />
          <Path d="M10 9V7a2 2 0 014 0v2" stroke={stroke} strokeWidth={1.15} strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
}
