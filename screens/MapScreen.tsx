import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { useNavigation } from '@react-navigation/native';

type Marker = {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
};

const MOCK_MARKERS: Marker[] = [
  { id: 'm1', label: 'Tinatangi Cafe', xPct: 35, yPct: 30 },
  { id: 'm2', label: "Perlas ng Silang", xPct: 62, yPct: 46 },
  { id: 'm3', label: "People's Park", xPct: 22, yPct: 62 },
  { id: 'm4', label: 'Aguinaldo Shrine', xPct: 73, yPct: 68 },
];

export default function MapScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');

  const markers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_MARKERS;
    return MOCK_MARKERS.filter((m) => m.label.toLowerCase().includes(q));
  }, [query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title=""
        showLogo
        showNotification
        onMenuPress={() => {}}
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />

      <View style={styles.content}>
        <View style={styles.searchBar} accessibilityRole="search">
          <Ionicons name="search" size={20} color={Colors.white} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search destinations"
            placeholderTextColor={Colors.text.light}
            style={styles.searchInput}
            accessibilityLabel="Search destinations"
          />
        </View>

        <View style={styles.mapFrame} accessibilityRole="image" accessibilityLabel="Map preview">
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapHint}>Map (prototype)</Text>
          </View>

          {markers.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.marker,
                {
                  left: `${m.xPct}%`,
                  top: `${m.yPct}%`,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Map marker: ${m.label}`}
              onPress={() => {}}
            >
              <Ionicons name="location" size={24} color={Colors.accent} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
  },
  searchBar: {
    height: 45,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    color: Colors.white,
    fontSize: 14,
    fontFamily: 'Poppins',
  },
  mapFrame: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.text.light + '33',
  },
  mapHint: {
    color: Colors.text.secondary,
    fontFamily: 'Poppins',
    fontWeight: '600',
  },
  mapFrameInner: {},
  marker: {
    position: 'absolute',
    transform: [{ translateX: -12 }, { translateY: -24 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

