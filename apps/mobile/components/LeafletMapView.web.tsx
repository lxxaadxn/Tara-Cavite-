import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { CAVITOUR_LEAFLET_HTML } from '../lib/cavitourLeafletMapHtml';
import {
  buildLeafletMapPayload,
  leafletHostPostMessageData,
} from '../lib/leafletMapBridge';
import type { LeafletMapViewProps } from './leafletMapTypes';

export type { LeafletMarker } from './leafletMapTypes';

/**
 * Expo web: react-native-webview is a stub. Same OSM Leaflet document in an iframe,
 * using postMessage so behavior matches iOS/Android WebView.
 */
export function LeafletMapView({
  markers,
  terminals = [],
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

  const pushToFrame = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const payload = buildLeafletMapPayload(markers, userLocation, terminals);
    win.postMessage(leafletHostPostMessageData(payload), '*');
  }, [markers, terminals, userLocation]);

  useEffect(() => {
    pushToFrame();
  }, [pushToFrame]);

  useEffect(() => {
    const onWindowMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (typeof e.data !== 'string') return;
      try {
        const msg = JSON.parse(e.data) as {
          type?: string;
          id?: string;
          name?: string;
          x?: number;
          y?: number;
        };
        if (msg.type === 'markerPreview' && msg.id && msg.x != null && msg.y != null) {
          onMarkerPreviewRef.current?.(msg.id, { x: msg.x, y: msg.y });
        } else if (msg.type === 'markerPreviewEnd') {
          onMarkerPreviewEndRef.current?.();
        } else if (msg.type === 'markerPress' && msg.id) {
          onMarkerPressRef.current?.(msg.id, msg.name ?? '');
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, []);

  return (
    <View style={[styles.wrap, style]}>
      {React.createElement('iframe', {
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
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
