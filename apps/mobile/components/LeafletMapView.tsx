import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { CAVITOUR_LEAFLET_HTML } from '../lib/cavitourLeafletMapHtml';
import {
  buildLeafletMapPayload,
  leafletInjectUpdateScript,
} from '../lib/leafletMapBridge';
import type { LeafletMapViewProps } from './leafletMapTypes';

export type { LeafletMarker } from './leafletMapTypes';

/** Leaflet + OpenStreetMap in WebView — iOS & Android (Expo Go / dev builds). */
export function LeafletMapView({
  markers,
  terminals = [],
  userLocation,
  onMarkerPress,
  style,
}: LeafletMapViewProps) {
  const webRef = useRef<WebView>(null);

  const pushToWeb = useCallback(() => {
    const payload = buildLeafletMapPayload(markers, userLocation, terminals);
    webRef.current?.injectJavaScript(leafletInjectUpdateScript(payload));
  }, [markers, terminals, userLocation]);

  useEffect(() => {
    pushToWeb();
  }, [pushToWeb]);

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        style={styles.web}
        source={{ html: CAVITOUR_LEAFLET_HTML, baseUrl: 'https://localhost' }}
        originWhitelist={['*']}
        onLoadEnd={pushToWeb}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data) as {
              type?: string;
              id?: string;
              name?: string;
            };
            if (msg.type === 'markerPress' && msg.id) {
              onMarkerPress(msg.id, msg.name ?? '');
            }
          } catch {
            /* ignore */
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        /* Map UX on native */
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        /* Android */
        overScrollMode="never"
        androidLayerType="hardware"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        /* iOS */
        allowsBackForwardNavigationGestures={false}
        cacheEnabled
        {...(Platform.OS === 'ios'
          ? {
              decelerationRate: 'fast' as const,
            }
          : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  web: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    opacity: 0.99,
  },
});
