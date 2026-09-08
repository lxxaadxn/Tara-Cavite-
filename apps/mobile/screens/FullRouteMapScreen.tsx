import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {

  View,

  Text,

  StyleSheet,

  TouchableOpacity,

  ActivityIndicator,

  Linking,

  Platform,

} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoute } from '@react-navigation/native';

import * as Location from 'expo-location';

import { DirectionsMapView } from '../components/DirectionsMapView';

import { Header } from '../components/Header';

import type { DirectionsMapPayload } from '../lib/directionsMapBridge';

import { fetchDrivingRoute, fetchFootRoute } from '../lib/fetchOsrmRoute';



const MUTED = '#737373';

const GREEN = '#10A37F';



export type FullRouteMapParams = {

  mapPayload: DirectionsMapPayload;

  destinationName?: string;

};






type LineGeo = { type: 'LineString'; coordinates: number[][] };



/** Full-screen OSRM route map — hydrates GPS + blue route after open. */

export default function FullRouteMapScreen() {

  const insets = useSafeAreaInsets();

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

      <DirectionsMapView payload={payload} style={styles.map} />



      <Header title={destLabel || 'Route'} showBack darkBackground />



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

    ...StyleSheet.absoluteFill,

    borderRadius: 0,

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


