import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { TAB_BAR_LABEL_FONT_SIZE, TAB_BAR_LABEL_LINE_HEIGHT } from '../lib/mainTabBarStyle';

const TEAL = '#1B8A70';

/** Viewfinder + code marks. Jam Icons ships no QR glyph, so it is drawn here. */
const SCAN_GLYPH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3" />
  <path d="M8 12h8" />
</svg>`;

type ScanTabButtonProps = BottomTabBarButtonProps & {
  /** Mirrors `tabBarShowLabel` so Scan isn't the lone labelled tab on narrow screens. */
  showLabel?: boolean;
};

/** Raised center Scan control for the main tab bar. */
export function ScanTabButton({ onPress, accessibilityState, showLabel = true }: ScanTabButtonProps) {
  const selected = !!accessibilityState?.selected;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Scan poster QR"
      accessibilityState={{ selected }}
      activeOpacity={0.85}
      style={styles.wrap}
    >
      <View style={styles.fab}>
        <SvgXml xml={SCAN_GLYPH} width={28} height={28} />
      </View>
      {showLabel ? <Text style={styles.label}>Scan</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -18,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  label: {
    marginTop: 2,
    fontSize: TAB_BAR_LABEL_FONT_SIZE,
    lineHeight: TAB_BAR_LABEL_LINE_HEIGHT,
    fontFamily: 'Poppins_500Medium',
    color: TEAL,
  },
});
