import React, { memo } from 'react';
import { SvgXml } from 'react-native-svg';

export const ADVISORY_RED = '#E76365';
export const BROADCAST_TEAL = '#1B8A70';

/** Stroke glyphs copied from web `components/NotificationsPopover.jsx` so both surfaces match. */
function glyphXml(kind: string | undefined, size: number, color: string): string {
  const stroke = `stroke="${color}" stroke-width="1.85" fill="none"`;
  const body =
    kind === 'advisory'
      ? `<path d="M12 9v4M12 17h.01" stroke-linecap="round" />
         <path d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" stroke-linejoin="round" />`
      : `<path d="M3 11v2a1 1 0 0 0 1 1h1l3 4h2V6H8L5 10H4a1 1 0 0 0-1 1Z" stroke-linejoin="round" />
         <path d="M15 9a4 4 0 0 1 0 6M18 7a7 7 0 0 1 0 10" stroke-linecap="round" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" ${stroke}>${body}</svg>`;
}

export type NotificationGlyphProps = {
  kind?: string;
  size?: number;
  color?: string;
};

function NotificationGlyphInner({ kind, size = 20, color }: NotificationGlyphProps) {
  const tint = color ?? (kind === 'advisory' ? ADVISORY_RED : BROADCAST_TEAL);
  return <SvgXml xml={glyphXml(kind, size, tint)} width={size} height={size} />;
}

export const NotificationGlyph = memo(NotificationGlyphInner);
