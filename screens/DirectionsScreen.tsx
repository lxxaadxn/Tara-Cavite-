import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/Theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { mockRouteSteps } from '../data/mockData';

const DirectionsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'guide' | 'fare'>('guide');
  const place = (route.params as any)?.place;

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'walk':
        return 'walk';
      case 'bus':
        return 'bus';
      case 'jeepney':
        return 'car';
      case 'tricycle':
        return 'bicycle';
      default:
        return 'navigate';
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'walk':
        return '#4CAF50';
      case 'bus':
        return '#2196F3';
      case 'jeepney':
        return '#FF9800';
      case 'tricycle':
        return '#9C27B0';
      default:
        return Colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Directions"
        showBack
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <View style={styles.content}>
        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color={Colors.text.light} />
            <Text style={styles.mapText}>Map with Route</Text>
          </View>
        </View>

        {/* Bottom Card */}
        <Card style={styles.bottomCard}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'guide' && styles.tabActive]}
              onPress={() => setActiveTab('guide')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'guide' && styles.tabTextActive,
                ]}
              >
                Commute Guide
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'fare' && styles.tabActive]}
              onPress={() => setActiveTab('fare')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'fare' && styles.tabTextActive,
                ]}
              >
                Estimated Fare
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'guide' ? (
            <ScrollView style={styles.stepsContainer}>
              {mockRouteSteps.map((step, index) => (
                <View key={step.id} style={styles.step}>
                  <View
                    style={[
                      styles.stepIconContainer,
                      { backgroundColor: getStepColor(step.type) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getStepIcon(step.type) as any}
                      size={24}
                      color={getStepColor(step.type)}
                    />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                    <View style={styles.stepInfo}>
                      <Text style={styles.stepInstruction}>
                        {step.instruction}
                      </Text>
                      <View style={styles.stepMeta}>
                        <View style={styles.stepMetaItem}>
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={Colors.text.secondary}
                          />
                          <Text style={styles.stepMetaText}>{step.duration}</Text>
                        </View>
                        <View style={styles.stepMetaItem}>
                          <Ionicons
                            name="cash-outline"
                            size={14}
                            color={Colors.text.secondary}
                          />
                          <Text style={styles.stepMetaText}>{step.fare}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.fareContainer}>
              <Text style={styles.fareTitle}>Total Estimated Fare</Text>
              <Text style={styles.fareAmount}>₱70</Text>
              <Text style={styles.fareBreakdown}>
                Bus: ₱45{'\n'}Jeepney: ₱25
              </Text>
            </View>
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    margin: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.card,
  },
  mapText: {
    marginTop: Theme.spacing.sm,
    color: Colors.text.secondary,
    fontSize: 16,
  },
  bottomCard: {
    maxHeight: '50%',
    borderTopLeftRadius: Theme.borderRadius.lg,
    borderTopRightRadius: Theme.borderRadius.lg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginTop: -Theme.borderRadius.lg,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.text.light,
    marginBottom: Theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  stepsContainer: {
    maxHeight: 400,
  },
  step: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.lg,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  stepContent: {
    flex: 1,
    flexDirection: 'row',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: Theme.spacing.sm,
  },
  stepInfo: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
    lineHeight: 20,
  },
  stepMeta: {
    flexDirection: 'row',
  },
  stepMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  stepMetaText: {
    marginLeft: Theme.spacing.xs,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  fareContainer: {
    padding: Theme.spacing.lg,
    alignItems: 'center',
  },
  fareTitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: Theme.spacing.sm,
  },
  fareAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Theme.spacing.md,
  },
  fareBreakdown: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default DirectionsScreen;
