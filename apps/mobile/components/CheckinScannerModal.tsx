import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { extractCheckinCodeFromText } from 'cavitour-shared/placeCheckin';
import { confirmCheckinFromCode, type ConfirmCheckinOptions } from '../lib/confirmCheckin';

const TEAL = '#1B8A70';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  checkinOptions?: ConfirmCheckinOptions;
  title?: string;
};

export function CheckinScannerModal({
  visible,
  onClose,
  onSuccess,
  checkinOptions,
  title = 'Scan poster QR',
}: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  // Reserve space for the floating header above permission-state content.
  // Measured via onLayout so it tracks notched phones; fallback covers first render.
  const centerPadTop = (headerHeight || insets.top + 52) + 24;

  useEffect(() => {
    if (!visible) {
      locked.current = false;
      setBusy(false);
      return;
    }
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const onBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (!visible || locked.current || busy) return;
      const code = extractCheckinCodeFromText(data);
      if (!code) return;
      locked.current = true;
      setBusy(true);
      try {
        const ok = await confirmCheckinFromCode(code, 'qr', checkinOptions);
        if (ok) {
          onSuccess?.();
          onClose();
        }
      } finally {
        setBusy(false);
        setTimeout(() => {
          locked.current = false;
        }, 1500);
      }
    },
    [busy, checkinOptions, onClose, onSuccess, visible]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {!permission ? (
          <View style={[styles.center, { paddingTop: centerPadTop }]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : !permission.granted ? (
          <View style={[styles.center, { paddingTop: centerPadTop }]}>
            <Text style={styles.hint}>Camera access is needed to scan printed establishment QR codes.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => void requestPermission()}>
              <Text style={styles.btnText}>Allow camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={busy ? undefined : onBarcode}
            />
            <View style={styles.frame} pointerEvents="none" />
            {busy ? (
              <View style={styles.busyOverlay} pointerEvents="none">
                <ActivityIndicator size="small" color="#a3e635" />
                <Text style={styles.busyText}>Recording your visit…</Text>
              </View>
            ) : null}
          </View>
        )}

        <View
          style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function ScanCheckinButton({
  onPress,
  label = 'Scan poster QR',
}: {
  onPress: () => void;
  label?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.scanBtn} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.scanBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 17, fontFamily: 'Poppins_500Medium', fontWeight: '600' },
  close: { color: '#a3e635', fontSize: 15, fontFamily: 'Inter_500Medium' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint: { color: '#e2e8f0', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  btn: {
    backgroundColor: TEAL,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  frame: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '22%',
    bottom: '28%',
    borderWidth: 2,
    borderColor: 'rgba(163, 230, 53, 0.9)',
    borderRadius: 16,
  },
  busyOverlay: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  busyText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  scanBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  scanBtnText: {
    color: TEAL,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    fontWeight: '600',
  },
});
