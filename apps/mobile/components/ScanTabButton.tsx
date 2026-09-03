import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { JamIcon } from './JamIcon';

const TEAL = '#1B8A70';

/** Raised center Scan control for the main tab bar. */
export function ScanTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
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
        <JamIcon name="picture" size={26} color="#FFFFFF" />
      </View>
      <Text style={styles.label}>Scan</Text>
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
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: TEAL,
  },
});
