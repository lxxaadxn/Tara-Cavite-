import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CAVITOUR_LEAFLET_HTML } from '../lib/cavitourLeafletMapHtml';
import {
  buildLeafletMapPayload,
  leafletHostPostMessageData,
} from '../lib/leafletMapBridge';
import type { LeafletMapViewProps } from './leafletMapTypes';

export type { LeafletMarker } from './leafletMapTypes';

/** The iframe document must report `mapReady` within this window, or Leaflet never booted. */
const MAP_READY_TIMEOUT_MS = 12000;

/**
 * Expo web: react-native-webview is a stub. Same OSM Leaflet document in an iframe,
 * using postMessage so behavior matches iOS/Android WebView.
 */
export function LeafletMapView({
  markers,
  userLocation,
  onMarkerPress,
  onMarkerPreview,
  onMarkerPreviewEnd,
  style,
}: LeafletMapViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onMarkerPressRef = useRef(onMarkerPress);
  const onMarkerPreviewRef = useRef(onMarkerPreview);
  const onMarkerPreviewEndRef = useRef(onMarkerPreviewEnd);
  onMarkerPressRef.current = onMarkerPress;
  onMarkerPreviewRef.current = onMarkerPreview;
  onMarkerPreviewEndRef.current = onMarkerPreviewEnd;

  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const pushToFrame = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const payload = buildLeafletMapPayload(markers, userLocation);
    win.postMessage(leafletHostPostMessageData(payload), '*');
  }, [markers, userLocation]);

  useEffect(() => {
    pushToFrame();
  }, [pushToFrame]);

  useEffect(() => {
    if (ready || failure) return undefined;
    const timer = setTimeout(() => setFailure('The map did not finish loading.'), MAP_READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready, failure, reloadKey]);

  useEffect(() => {
    const onWindowMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (typeof e.data !== 'string') return;
      try {
        const msg = JSON.parse(e.data) as {
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
          setReady(true);
          setFailure(null);
        } else if (msg.type === 'mapInitFailed') {
          setFailure(`Map failed to initialize: ${msg.message ?? 'unknown error'}`);
        } else if (msg.type === 'markerPreview' && msg.id && msg.x != null && msg.y != null) {
          onMarkerPreviewRef.current?.(msg.id, { x: msg.x, y: msg.y });
        } else if (msg.type === 'markerPreviewEnd') {
          onMarkerPreviewEndRef.current?.();
        } else if (msg.type === 'markerPress' && msg.id) {
          onMarkerPressRef.current?.(msg.id, msg.name ?? '');
        }
      } catch {
        // Non-JSON chatter from the document is not actionable.
      }
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, []);

  const retry = useCallback(() => {
    setFailure(null);
    setReady(false);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <View style={[styles.wrap, style]}>
      {React.createElement('iframe', {
        key: reloadKey,
        ref: iframeRef,
        srcDoc: CAVITOUR_LEAFLET_HTML,
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          backgroundColor: '#E8E8E8',
        },
        sandbox: 'allow-scripts allow-same-origin',
        title: 'Tara, Cavite! map',
        onLoad: pushToFrame,
        onError: () => setFailure('The map failed to load.'),
      })}
      {!ready && !failure ? (
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
