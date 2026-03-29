import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JamIcon } from '../components/JamIcon';
import { useNavigation } from '@react-navigation/native';

const H_PAD = 16;
const OVERLAY_TOP = 10;
const GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const MUTED = '#7A7878';
const MAP_BG = '#E8E8E8';

export default function MapScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.mapFrame} accessibilityLabel="Map">
          <View style={styles.mapLayer} />

          <View
            style={[styles.frameOverlay, { paddingTop: OVERLAY_TOP, paddingHorizontal: H_PAD }]}
            pointerEvents="box-none"
          >
            <View
              style={styles.wordmarkRow}
              accessible
              accessibilityRole="header"
              accessibilityLabel="CaviTour"
              pointerEvents="none"
            >
              <Text style={styles.wordmarkC}>C</Text>
              <Text style={styles.wordmarkAvi}>avi</Text>
              <Text style={styles.wordmarkTour}>Tour</Text>
            </View>

            <View style={styles.searchWrap} accessibilityRole="search" pointerEvents="auto">
              <View style={styles.searchPill}>
                <JamIcon name="search" size={17} color={MUTED} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Where are you going?"
                  placeholderTextColor={MUTED}
                  style={styles.searchInput}
                  accessibilityLabel="Search map destinations"
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (query.trim()) {
                      navigation.navigate('PlaceDetail' as never, { query: query.trim() } as never);
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MAP_BG,
  },
  safeTop: {
    flex: 1,
    backgroundColor: MAP_BG,
  },
  mapFrame: {
    flex: 1,
    width: '100%',
    backgroundColor: MAP_BG,
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MAP_BG,
  },
  frameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 10,
  },
  wordmarkC: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 34,
    lineHeight: 40,
    color: GREEN,
  },
  wordmarkAvi: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 34,
    lineHeight: 40,
    color: GREEN,
  },
  wordmarkTour: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 34,
    lineHeight: 40,
    color: TEAL,
  },
  searchWrap: {
    borderRadius: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
    alignSelf: 'stretch',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 120, 120, 0.35)',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#000000',
  },
});
