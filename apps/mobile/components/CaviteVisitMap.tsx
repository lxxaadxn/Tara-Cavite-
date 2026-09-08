import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { foldLguName } from 'cavitour-shared/lguKind';
import {
  buildCaviteChoroplethHtml,
  choroplethInjectUpdateScript,
} from '../lib/caviteChoroplethHtml';
import { clearCaviteLguGeojsonCache, loadCaviteLguGeojson } from '../lib/caviteGeojsonAsset';
import { clearVendoredLeafletCache, loadVendoredLeaflet } from '../lib/leafletVendoredAssets';

const TITLE = '#171717';
const MUTED = '#737373';
const TEAL = '#1B8A70';
const PANEL_BG = '#F1F7F6';
const IDLE_FILL = '#E2E8F0';

/** The document must report `mapReady` in this window, or Leaflet never booted. */
const MAP_READY_TIMEOUT_MS = 12000;

export type CaviteVisit = { cityMun?: string };

export type CaviteVisitMapProps = {
  visits: CaviteVisit[];
};

/**
 * Cavite LGU choropleth for the profile — mirrors web `components/CaviteVisitMap.jsx`.
 * Tapping an LGU reports its visit count below the map (mobile has no hover).
 */
export function CaviteVisitMap({ visits }: CaviteVisitMapProps) {
  const webRef = useRef<WebView>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [tapped, setTapped] = useState<{ name: string; count: number } | null>(null);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const visit of visits ?? []) {
      const key = foldLguName(String(visit.cityMun ?? '').trim());
      if (!key) continue;
      out[key] = (out[key] ?? 0) + 1;
    }
    return out;
  }, [visits]);

  const visitedCount = Object.keys(counts).length;

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadVendoredLeaflet(), loadCaviteLguGeojson()])
      .then(([vendored, geojson]) => {
        if (cancelled) return;
        if (!geojson) {
          setFailure('Cavite boundaries could not be loaded.');
          return;
        }
        setHtml(buildCaviteChoroplethHtml(vendored, geojson));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[CaviteVisitMap] could not prepare the map document', err);
        setFailure('The map could not be prepared.');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!html || ready || failure) return undefined;
    const timer = setTimeout(() => setFailure('The map did not finish loading.'), MAP_READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [html, ready, failure]);

  const push = useCallback(() => {
    webRef.current?.injectJavaScript(choroplethInjectUpdateScript(counts));
  }, [counts]);

  useEffect(() => {
    push();
  }, [push]);

  const handleMessage = useCallback(
    (data: string) => {
      try {
        const msg = JSON.parse(data) as {
          type?: string;
          level?: string;
          message?: string;
          name?: string;
          count?: number;
        };
        if (msg.type === 'console' && msg.message) {
          const level = msg.level === 'error' ? 'error' : msg.level === 'warn' ? 'warn' : 'log';
          console[level](`[CaviteVisitMap] ${msg.message}`);
        } else if (msg.type === 'mapReady') {
          setReady(true);
          setFailure(null);
          push();
        } else if (msg.type === 'mapInitFailed') {
          setFailure(`Map failed to initialize: ${msg.message ?? 'unknown error'}`);
        } else if (msg.type === 'lguPress' && msg.name) {
          setTapped({ name: msg.name, count: msg.count ?? 0 });
        } else if (msg.type === 'lguPressEnd') {
          setTapped(null);
        }
      } catch {
        // Non-JSON chatter from the document is not actionable.
      }
    },
    [push]
  );

  const retry = useCallback(() => {
    clearVendoredLeafletCache();
    clearCaviteLguGeojsonCache();
    setFailure(null);
    setHtml(null);
    setReady(false);
    setReloadKey((k) => k + 1);
  }, []);

  const caption = tapped
    ? tapped.count > 0
      ? `${tapped.name} · ${tapped.count} visit${tapped.count === 1 ? '' : 's'}`
      : `${tapped.name} · not visited yet`
    : visitedCount
      ? 'Areas you have reached light up in teal. Tap a city or municipality for visit counts.'
      : 'Reach or check in to destinations — visited cities and municipalities will light up here.';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cavite travel map</Text>
      <Text style={[styles.caption, tapped ? styles.captionActive : null]}>{caption}</Text>

      <View style={styles.mapWrap}>
        {html ? (
          <WebView
            key={reloadKey}
            ref={webRef}
            style={styles.web}
            source={{ html, baseUrl: 'https://localhost' }}
            onLoadEnd={push}
            onMessage={(e) => handleMessage(e.nativeEvent.data)}
            onError={(e) => {
              console.error(
                '[CaviteVisitMap] WebView onError:',
                e.nativeEvent.description ?? e.nativeEvent.url
              );
              setFailure(e.nativeEvent.description || 'The map failed to load.');
            }}
            onRenderProcessGone={() => setFailure('The map renderer crashed.')}
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
        {!ready && !failure ? (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator color={TEAL} />
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

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: TEAL }]} />
          <Text style={styles.legendLabel}>Visited</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendSwatchIdle]} />
          <Text style={styles.legendLabel}>Not yet</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: TITLE,
  },
  caption: {
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },
  captionActive: {
    fontFamily: 'Inter_600SemiBold',
    color: TEAL,
  },
  mapWrap: {
    marginTop: 14,
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  web: {
    flex: 1,
    backgroundColor: PANEL_BG,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PANEL_BG,
    gap: 12,
    padding: 20,
  },
  failureText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#5B4636',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: TEAL,
  },
  retryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  legendRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendSwatchIdle: {
    backgroundColor: IDLE_FILL,
    borderWidth: 1,
    borderColor: '#D4D4D4',
  },
  legendLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: MUTED,
  },
});
