import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {

  View,

  Text,

  StyleSheet,

  TouchableOpacity,

  StatusBar,

  ActivityIndicator,

  Linking,

  Platform,

} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoute, useNavigation } from '@react-navigation/native';

import * as Location from 'expo-location';

import { JamIcon } from '../components/JamIcon';

import { DirectionsMapView } from '../components/DirectionsMapView';

import type { DirectionsMapPayload } from '../lib/directionsMapBridge';

import { fetchDrivingRoute, fetchFootRoute } from '../lib/fetchOsrmRoute';



const TITLE = '#241D13';

const MUTED = '#737373';

const GREEN = '#7EA00E';

const WHITE = '#FFFFFF';



export type FullRouteMapParams = {

  mapPayload: DirectionsMapPayload;

  destinationName?: string;

};

type LineGeo = { type: 'LineString'; coordinates: number[][] };



export default function FullRouteMapScreen() {

  const insets = useSafeAreaInsets();

  const navigation = useNavigation();

  const route = useRoute();

  const { mapPayload: initialPayload, destinationName } = route.params as FullRouteMapParams;



  const [payload, setPayload] = useState<DirectionsMapPayload>(initialPayload);

  const [hydrating, setHydrating] = useState(true);

  const [locDenied, setLocDenied] = useState(false);



  const destLabel = destinationName?.trim() || 'Route map';



  const hydrateMap = useCallback(async () => {

    setHydrating(true);

    const destLat = initialPayload.destLat;

    const destLng = initialPayload.destLng;

    if (destLat == null || destLng == null || Number.isNaN(destLat) || Number.isNaN(destLng)) {

      setHydrating(false);

      return;

    }



    let userLat = initialPayload.userLat;

    let userLng = initialPayload.userLng;

    let routeGeoJson = initialPayload.routeGeoJson;

    let routeSegmentsGeoJson = initialPayload.routeSegmentsGeoJson ?? null;



    try {

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {

        setLocDenied(true);

      } else {

        setLocDenied(false);

        try {

          const pos = await Location.getCurrentPositionAsync({

            accuracy: Location.Accuracy.Balanced,

          });

          userLat = pos.coords.latitude;

          userLng = pos.coords.longitude;

        } catch {

          setLocDenied(true);

        }

      }



      if (userLat != null && userLng != null && !Number.isNaN(userLat) && !Number.isNaN(userLng)) {

        if (!routeGeoJson?.coordinates?.length) {

          const driving = await fetchDrivingRoute(

            { lat: userLat, lng: userLng },

            { lat: destLat, lng: destLng }

          );

          routeGeoJson = driving?.geometry ?? null;

          if (!routeGeoJson) {

            const foot = await fetchFootRoute(

              { lat: userLat, lng: userLng },

              { lat: destLat, lng: destLng }

            );

            routeGeoJson = foot?.geometry ?? null;

          }

        }



        if (!routeSegmentsGeoJson?.length && routeGeoJson) {

          routeSegmentsGeoJson = [routeGeoJson as LineGeo];

        }

      }



      setPayload({

        userLat,

        userLng,

        destLat,

        destLng,

        routeGeoJson,

        routeSegmentsGeoJson,

      });

    } finally {

      setHydrating(false);

    }

  }, [initialPayload]);



  useEffect(() => {

    void hydrateMap();

  }, [hydrateMap]);



  useEffect(() => {

    let sub: Location.LocationSubscription | null = null;

    let cancelled = false;



    if (locDenied) return;



    Location.watchPositionAsync(

      {

        accuracy: Location.Accuracy.Balanced,

        timeInterval: 6000,

        distanceInterval: 25,

      },

      (loc) => {

        if (cancelled) return;

        const lat = loc.coords.latitude;

        const lng = loc.coords.longitude;

        setPayload((prev) => ({ ...prev, userLat: lat, userLng: lng }));

      }

    )

      .then((s) => {

        if (cancelled) s.remove();

        else sub = s;

      })

      .catch(() => {});



    return () => {

      cancelled = true;

      sub?.remove();

    };

  }, [locDenied]);



  const banner = useMemo(() => {

    if (hydrating) return 'Loading your route…';

    if (locDenied && payload.userLat == null) {

      return 'Turn on location to see your position and the blue route line.';

    }

    if (!payload.routeGeoJson?.coordinates?.length && payload.userLat != null) {

      return 'Road route unavailable — showing destination only.';

    }

    return null;

  }, [hydrating, locDenied, payload]);



  const openLocationSettings = () => {

    if (Platform.OS === 'ios') {

      void Linking.openURL('app-settings:');

    } else {

      void Linking.openSettings();

    }

  };



  return (

    <View style={styles.root}>

      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <DirectionsMapView payload={payload} style={styles.map} />



      <View style={[styles.backOverlay, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">

        <TouchableOpacity

          style={styles.backBarBtn}

          onPress={() => navigation.goBack()}

          accessibilityRole="button"

          accessibilityLabel="Go back"

          activeOpacity={0.75}

          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}

        >

          <View style={styles.backBarIconWrap}>

            <JamIcon ionicon="arrow-back" size={22} color={TITLE} />

          </View>

          <Text style={styles.backBarLabel}>Back</Text>

        </TouchableOpacity>

        {destLabel ? (

          <Text style={styles.mapTitle} numberOfLines={1}>

            {destLabel}

          </Text>

        ) : null}

      </View>



      {banner || hydrating ? (

        <View style={[styles.banner, { top: insets.top + 72 }]} pointerEvents="box-none">

          <View style={styles.bannerInner}>

            {hydrating ? <ActivityIndicator size="small" color={GREEN} style={{ marginRight: 8 }} /> : null}

            <Text style={styles.bannerText}>{banner ?? 'Loading…'}</Text>

            {locDenied && !hydrating ? (

              <TouchableOpacity onPress={openLocationSettings} style={styles.bannerBtn}>

                <Text style={styles.bannerBtnText}>Open settings</Text>

              </TouchableOpacity>

            ) : null}

          </View>

        </View>

      ) : null}

    </View>

  );

}



const styles = StyleSheet.create({

  root: {

    flex: 1,

    backgroundColor: '#dfe6e9',

  },

  map: {

    ...StyleSheet.absoluteFillObject,

    borderRadius: 0,

  },

  backOverlay: {

    position: 'absolute',

    left: 0,

    right: 0,

    top: 0,

    paddingHorizontal: 12,

    zIndex: 10,

  },

  backBarBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    alignSelf: 'flex-start',

    gap: 10,

    minHeight: 44,

    paddingRight: 12,

  },

  backBarIconWrap: {

    width: 40,

    height: 40,

    borderRadius: 20,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#F3F4F6',

    borderWidth: 1,

    borderColor: 'rgba(17, 24, 39, 0.08)',

  },

  backBarLabel: {

    fontFamily: 'Poppins_600SemiBold',

    fontSize: 16,

    lineHeight: 22,

    color: TITLE,

  },

  mapTitle: {

    marginTop: 6,

    marginLeft: 4,

    fontFamily: 'Poppins_500Medium',

    fontSize: 15,

    color: TITLE,

    maxWidth: '92%',

  },

  banner: {

    position: 'absolute',

    left: 12,

    right: 12,

    zIndex: 9,

  },

  bannerInner: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    alignItems: 'center',

    backgroundColor: 'rgba(255,255,255,0.94)',

    borderRadius: 12,

    paddingHorizontal: 12,

    paddingVertical: 10,

    borderWidth: 1,

    borderColor: 'rgba(0,0,0,0.06)',

  },

  bannerText: {

    flex: 1,

    fontFamily: 'Inter_400Regular',

    fontSize: 12,

    lineHeight: 17,

    color: MUTED,

    minWidth: 120,

  },

  bannerBtn: {

    marginLeft: 8,

    paddingVertical: 4,

    paddingHorizontal: 8,

  },

  bannerBtnText: {

    fontFamily: 'Poppins_600SemiBold',

    fontSize: 12,

    color: GREEN,

  },

});


