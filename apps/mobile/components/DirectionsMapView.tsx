import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildDirectionsLeafletHtml } from '../lib/directionsLeafletMapHtml';
import { useVendoredLeafletHtml } from '../lib/useVendoredLeafletHtml';
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
  const { html, failure, setFailure, markReady, retry, reloadKey } = useVendoredLeafletHtml(
    buildDirectionsLeafletHtml,
    'DirectionsMapView'
  );

  const push = useCallback(() => {
    const p = buildDirectionsMapPayload(payload);
    webRef.current?.injectJavaScript(directionsInjectUpdateScript(p));
  }, [payload]);

  useEffect(() => {
    push();
  }, [push]);

  const handleDiagMessage = useCallback(
    (data: string) => {
      try {
        const msg = JSON.parse(data) as { type?: string; level?: string; message?: string };
        if (msg.type === 'console' && msg.message) {
          const level = msg.level === 'error' ? 'error' : msg.level === 'warn' ? 'warn' : 'log';
          console[level](`[DirectionsMapView] ${msg.message}`);
        } else if (msg.type === 'mapReady') {
          markReady();
        } else if (msg.type === 'mapInitFailed') {
          setFailure(`Map failed to initialize: ${msg.message ?? 'unknown error'}`);
        }
      } catch {
        // Non-JSON chatter from the document is not actionable.
      }
    },
    [markReady, setFailure]
  );

  return (
    <View style={[styles.wrap, style]}>
      {html ? (
        <WebView
          key={reloadKey}
          ref={webRef}
          style={styles.web}
          source={{ html, baseUrl: 'https://localhost' }}
          onLoadEnd={push}
          onMessage={(e) => handleDiagMessage(e.nativeEvent.data)}
          onError={(e) => {
            console.error(
              '[DirectionsMapView] WebView onError:',
              e.nativeEvent.description ?? e.nativeEvent.url
            );
            setFailure(e.nativeEvent.description || 'The map failed to load.');
          }}
          onHttpError={(e) => {
            console.warn(
              '[DirectionsMapView] WebView onHttpError:',
              e.nativeEvent.statusCode,
              e.nativeEvent.url
            );
          }}
          onRenderProcessGone={(e) => {
            console.error(
              '[DirectionsMapView] WebView render process gone:',
              e.nativeEvent.didCrash
            );
            setFailure('The map renderer crashed.');
          }}
          originWhitelist={['*']}
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
    flex: 1,
    minHeight: 220,
    overflow: 'hidden',
    borderRadius: 12,
  },
  web: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    gap: 12,
    padding: 24,
  },
  failureText: {
    color: '#334155',
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
