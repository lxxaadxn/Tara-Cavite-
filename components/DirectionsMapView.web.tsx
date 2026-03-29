import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { DIRECTIONS_LEAFLET_HTML } from '../lib/directionsLeafletMapHtml';
import {
  buildDirectionsMapPayload,
  directionsHostPostMessageData,
  type DirectionsMapPayload,
} from '../lib/directionsMapBridge';

type Props = {
  payload: DirectionsMapPayload;
  style?: object;
};

export function DirectionsMapView({ payload, style }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const pushToFrame = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const p = buildDirectionsMapPayload(payload);
    win.postMessage(directionsHostPostMessageData(p), '*');
  }, [payload]);

  useEffect(() => {
    pushToFrame();
  }, [pushToFrame]);

  return (
    <View style={[styles.wrap, style]}>
      {React.createElement('iframe', {
        ref: iframeRef,
        srcDoc: DIRECTIONS_LEAFLET_HTML,
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          borderRadius: 12,
          backgroundColor: '#e2e8f0',
        },
        sandbox: 'allow-scripts allow-same-origin',
        title: 'Directions map',
        onLoad: pushToFrame,
      })}
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
});
