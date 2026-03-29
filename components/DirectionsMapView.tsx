import React, { useCallback, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { DIRECTIONS_LEAFLET_HTML } from '../lib/directionsLeafletMapHtml';
import {
  buildDirectionsMapPayload,
  directionsInjectUpdateScript,
  type DirectionsMapPayload,
} from '../lib/directionsMapBridge';

type Props = {
  payload: DirectionsMapPayload;
  style?: object;
};

export function DirectionsMapView({ payload, style }: Props) {
  const webRef = useRef<WebView>(null);

  const push = useCallback(() => {
    const p = buildDirectionsMapPayload(payload);
    webRef.current?.injectJavaScript(directionsInjectUpdateScript(p));
  }, [payload]);

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        style={styles.web}
        source={{ html: DIRECTIONS_LEAFLET_HTML, baseUrl: 'https://localhost' }}
        originWhitelist={['*']}
        onLoadEnd={push}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        androidLayerType="hardware"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        cacheEnabled
        {...(Platform.OS === 'ios' ? { decelerationRate: 'fast' as const } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 220,
    overflow: 'hidden',
    borderRadius: 12,
  },
  web: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
});
