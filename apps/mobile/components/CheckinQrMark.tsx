import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

type Props = {
  /** Payload encoded in the QR (deep link, web URL, or CT- code). */
  value: string;
  size?: number;
};

/**
 * Local QR rendering (no remote image host). Used for posters / sharing —
 * on-device check-in still uses the Check in here button (camera cannot scan this screen).
 */
export function CheckinQrMark({ value, size = 200 }: Props) {
  const payload = String(value || '').trim();
  if (!payload) {
    return <View style={[styles.box, { width: size, height: size }]} />;
  }
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <QRCode value={payload} size={size - 16} backgroundColor="#ffffff" color="#0f172a" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 8,
  },
});
