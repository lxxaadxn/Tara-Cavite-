import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/Theme';
import { Terminal } from '../data/mockData';

const TerminalDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const terminal = (route.params as any)?.terminal as Terminal;
  const [destinationQuery, setDestinationQuery] = useState('');

  if (!terminal) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Terminal not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient header with close */}
      <View style={styles.headerGradient}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.terminalName}>{terminal.name}</Text>
        <Text style={styles.transportTypes}>
          {terminal.transportTypes.join(', ')}
        </Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{terminal.status}</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={Colors.text.light} />
          <TextInput
            style={styles.searchInput}
            placeholder="Type your destination"
            placeholderTextColor={Colors.text.light}
            value={destinationQuery}
            onChangeText={setDestinationQuery}
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Operating Hours</Text>
            <Text style={styles.infoValue}>{terminal.operatingHours}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Average Fare</Text>
            <Text style={styles.infoValue}>{terminal.averageFare}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Payment Type</Text>
            <Text style={styles.infoValue}>{terminal.paymentType}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Primary Routes</Text>
        <View style={styles.routesList}>
          {terminal.primaryRoutes.map((route, i) => (
            <Text key={i} style={styles.routeItem}>
              • {route.label}: {route.fare}
            </Text>
          ))}
        </View>

        {terminal.reminders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Reminder</Text>
            <View style={styles.remindersList}>
              {terminal.reminders.map((rem, i) => (
                <Text key={i} style={styles.reminderItem}>
                  • {rem}
                </Text>
              ))}
            </View>
          </>
        )}

        <View style={styles.mapPreview}>
          <Ionicons name="map" size={48} color={Colors.text.light} />
          <Text style={styles.mapPreviewText}>Map preview</Text>
        </View>

        <TouchableOpacity
          style={styles.getDirectionBtn}
          onPress={() =>
            navigation.navigate('Directions' as never, {
              place: {
                id: terminal.id,
                name: terminal.name,
                address: terminal.name,
                type: 'Terminal',
                hours: terminal.operatingHours,
                latitude: terminal.latitude,
                longitude: terminal.longitude,
              },
            } as never)
          }
          activeOpacity={0.85}
        >
          <Text style={styles.getDirectionText}>Get Direction</Text>
        </TouchableOpacity>
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
    paddingTop: 50,
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Colors.gradient.start,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  bodyContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl + 24,
  },
  terminalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  transportTypes: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.lg,
  },
  statusText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm + 4,
    marginBottom: Theme.spacing.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.sm,
  },
  infoGrid: {
    marginBottom: Theme.spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  routesList: {
    marginBottom: Theme.spacing.lg,
  },
  routeItem: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  remindersList: {
    marginBottom: Theme.spacing.lg,
  },
  reminderItem: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
    lineHeight: 20,
  },
  mapPreview: {
    height: 160,
    backgroundColor: Colors.background,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
  },
  mapPreviewText: {
    marginTop: Theme.spacing.sm,
    fontSize: 14,
    color: Colors.text.light,
  },
  getDirectionBtn: {
    backgroundColor: Colors.directionButton.start,
    paddingVertical: Theme.spacing.md + 4,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getDirectionText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TerminalDetailScreen;
