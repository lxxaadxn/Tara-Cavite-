import React, { memo } from 'react';
import { SvgXml } from 'react-native-svg';
import { JAM_SVG, type JamIconName } from '../lib/jamSvgMap';
import { legacyIoniconToJam } from '../lib/legacyIoniconToJam';

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function colorize(xml: string, color: string): string {
  const c = escapeAttr(color);
  return xml
    .replace(/<path\b/g, `<path fill="${c}"`)
    .replace(/<circle\b/g, `<circle fill="${c}"`)
    .replace(/<rect\b/g, `<rect fill="${c}"`)
    .replace(/<polygon\b/g, `<polygon fill="${c}"`);
}

export type { JamIconName };

export type JamIconProps = {
  size: number;
  color: string;
  /** Bundled Jam icon id (same names as jam-icons / Iconduck). */
  name?: JamIconName;
  /** Former Ionicons name — resolved via {@link legacyIoniconToJam}. */
  ionicon?: string;
};

function JamIconInner({ name, ionicon, size, color }: JamIconProps) {
  const jamName = name ?? legacyIoniconToJam(ionicon ?? '');
  const raw = JAM_SVG[jamName];
  if (!raw) return null;
  return <SvgXml xml={colorize(raw, color)} width={size} height={size} />;
}

export const JamIcon = memo(JamIconInner);
