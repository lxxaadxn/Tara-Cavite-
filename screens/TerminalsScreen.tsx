import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';
import { mockTerminals, Terminal } from '../data/mockData';

const TerminalsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [transportMode, setTransportMode] = useState<'jeepney' | 'car'>('jeepney');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mockTerminals;
    return mockTerminals.filter((t) => t.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const dasmaBayan = filtered.filter((t) => t.category === 'dasma-bayan');
  const other = filtered.filter((t) => t.category === 'other');

  const renderTerminalItem = (terminal: Terminal) => (
    <TouchableOpacity
      key={terminal.id}
      style={styles.terminalItem}
      onPress={() =>
        navigation.navigate('TerminalDetail' as never, { terminal } as never)
      }
      activeOpacity={0.7}
    >
      <Ionicons name="bus" size={24} color={Colors.text.secondary} />
      <Text style={styles.terminalName}>{terminal.name}</Text>
      <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Purple-blue gradient-style header */}
      <View style={styles.headerGradient}>
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="menu" size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search terminal."
            placeholderTextColor={Colors.text.light}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="search" size={20} color={Colors.text.secondary} />
        </View>
        <View style={styles.transportRow}>
          <TouchableOpacity
            style={[
              styles.transportBtn,
              transportMode === 'jeepney' && styles.transportBtnActive,
            ]}
            onPress={() => setTransportMode('jeepney')}
          >
            <Ionicons
              name="bus"
              size={22}
              color={transportMode === 'jeepney' ? Colors.white : Colors.text.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.transportBtn,
              transportMode === 'car' && styles.transportBtnActive,
            ]}
            onPress={() => setTransportMode('car')}
          >
            <Ionicons
              name="car"
              size={22}
              color={transportMode === 'car' ? Colors.white : Colors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {dasmaBayan.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Terminals with jeepney to Dasma Bayan
            </Text>
            {dasmaBayan.map(renderTerminalItem)}
          </>
        )}
        {other.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Theme.spacing.lg }]}>
              Other terminals
            </Text>
            {other.map(renderTerminalItem)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerGradient: {
    backgroundColor: Colors.gradient.start,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm + 4,
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
  transportRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  transportBtn: {
    width: 56,
    height: 56,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportBtnActive: {
    backgroundColor: Colors.gradient.end,
  },
  body: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  bodyContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  terminalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.text.light + '30',
    ...Theme.shadows.card,
  },
  terminalName: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 15,
    color: Colors.text.primary,
  },
});

export default TerminalsScreen;
