import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildCavitourLeafletHtml } from '../lib/cavitourLeafletMapHtml';
import { useVendoredLeafletHtml } from '../lib/useVendoredLeafletHtml';
import {
  buildLeafletMapPayload,
  leafletInjectUpdateScript,
} from '../lib/leafletMapBridge';
import type { LeafletMapViewProps } from './leafletMapTypes';

export type { LeafletMarker, LeafletPreviewPoint } from './leafletMapTypes';

/** Leaflet + OpenStreetMap in WebView — iOS & Android (Expo Go / dev builds). */
export function LeafletMapView({
  markers,
  userLocation,
  onMarkerPress,
  onMarkerPreview,
  onMarkerPreviewEnd,
  style,
}: LeafletMapViewProps) {
  const webRef = useRef<WebView>(null);
  const { html, failure, setFailure, markReady, retry, reloadKey } = useVendoredLeafletHtml(
    buildCavitourLeafletHtml,
    'LeafletMapView'
  );

  const pushToWeb = useCallback(() => {
    const payload = buildLeafletMapPayload(markers, userLocation);
    webRef.current?.injectJavaScript(leafletInjectUpdateScript(payload));
  }, [markers, userLocation]);

  useEffect(() => {
    pushToWeb();
  }, [pushToWeb]);

  const handleDiagMessage = useCallback(
    (data: string) => {
      try {
        const msg = JSON.parse(data) as {
          type?: string;
          level?: string;
          message?: string;
          id?: string;
          name?: string;
          x?: number;
          y?: number;
        };
        if (msg.type === 'console' && msg.message) {
          const level = msg.level === 'error' ? 'error' : msg.level === 'warn' ? 'warn' : 'log';
          console[level](`[LeafletMapView] ${msg.message}`);
        } else if (msg.type === 'mapReady') {
          markReady();
        } else if (msg.type === 'mapInitFailed') {
          setFailure(`Map failed to initialize: ${msg.message ?? 'unknown error'}`);
        } else if (msg.type === 'markerPreview' && msg.id && msg.x != null && msg.y != null) {
          onMarkerPreview?.(msg.id, { x: msg.x, y: msg.y });
        } else if (msg.type === 'markerPreviewEnd') {
          onMarkerPreviewEnd?.();
        } else if (msg.type === 'markerPress' && msg.id) {
          onMarkerPress?.(msg.id, msg.name ?? '');
        }
      } catch {
        // Non-JSON chatter from the document is not actionable.
      }
    },
    [onMarkerPreview, onMarkerPreviewEnd, onMarkerPress, markReady, setFailure]
  );

  const webViewProps = useMemo(
    () => ({
      originWhitelist: ['*'] as string[],
      javaScriptEnabled: true,
      domStorageEnabled: true,
      setSupportMultipleWindows: false,
      allowsInlineMediaPlayback: true,
      mediaPlaybackRequiresUserAction: false,
      /* Map UX on native */
      bounces: false,
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      /* Android */
      overScrollMode: 'never' as const,
      androidLayerType: 'hardware' as const,
      setBuiltInZoomControls: false,
      setDisplayZoomControls: false,
      /* iOS */
      allowsBackForwardNavigationGestures: false,
      cacheEnabled: true,
      ...(Platform.OS === 'ios' ? { decelerationRate: 'fast' as const } : {}),
    }),
    []
  );

  return (
    <View style={[styles.wrap, style]}>
      {html ? (
        <WebView
          key={reloadKey}
          ref={webRef}
          style={styles.web}
          source={{ html, baseUrl: 'https://localhost' }}
          onLoadEnd={pushToWeb}
          onMessage={(e) => handleDiagMessage(e.nativeEvent.data)}
          onError={(e) => {
            console.error(
              '[LeafletMapView] WebView onError:',
              e.nativeEvent.description ?? e.nativeEvent.url
            );
            setFailure(e.nativeEvent.description || 'The map failed to load.');
          }}
          onHttpError={(e) => {
            console.warn(
              '[LeafletMapView] WebView onHttpError:',
              e.nativeEvent.statusCode,
              e.nativeEvent.url
            );
          }}
          onRenderProcessGone={(e) => {
            console.error('[LeafletMapView] WebView render process gone:', e.nativeEvent.didCrash);
            setFailure('The map renderer crashed.');
          }}
          {...webViewProps}
        />
      ) : null}
      {!html && !failure ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color="#1B8A70" />
        </View>
      ) : null}
      {failure ? (
        <View style={styles.overlay}>
          <Text style={styles.failureText}>{failure}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={retry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading the map"
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  web: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEFEA',
    gap: 12,
    padding: 24,
  },
  failureText: {
    color: '#5B4636',
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1B8A70',
  },
  retryLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
