import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';

interface PreferenceItem {
  id: string;
  title: string;
  subtitle?: string;
  checked: boolean;
}

const PreferencesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [travelModes, setTravelModes] = useState<PreferenceItem[]>([
    { id: '1', title: 'Bus/Jeepney', checked: true },
    { id: '2', title: 'Tricycle', checked: false },
    { id: '3', title: 'Walking', checked: false },
  ]);

  const [routePriorities, setRoutePriorities] = useState<PreferenceItem[]>([
    {
      id: '1',
      title: 'Avoid Traffic',
      checked: true,
    },
    {
      id: '2',
      title: 'Direct route',
      subtitle: 'Prioritizes single-ride bus or jeepney routes to minimize transfers and boarding frequency.',
      checked: true,
    },
  ]);

  const [fare, setFare] = useState<PreferenceItem[]>([
    { id: '1', title: 'Student/Senior/PWD Discount', checked: true },
  ]);

  const [notifications, setNotifications] = useState<PreferenceItem[]>([
    { id: '1', title: 'Allow to send notification', checked: true },
    {
      id: '2',
      title: 'Arrival Alert',
      subtitle: 'Notify me when I am 2 minutes away from my stop',
      checked: true,
    },
    {
      id: '3',
      title: 'Rain Alert',
      subtitle: 'A notification if it starts raining in your destination area, suggesting covered terminals or jeepneys over tricycles.',
      checked: true,
    },
  ]);

  const toggleItem = (
    items: PreferenceItem[],
    setItems: (items: PreferenceItem[]) => void,
    id: string
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const renderSection = (
    title: string,
    items: PreferenceItem[],
    setItems: (items: PreferenceItem[]) => void
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.sectionCard}>
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              style={styles.preferenceItem}
              onPress={() => toggleItem(items, setItems, item.id)}
              accessibilityLabel={`${item.title}, ${item.checked ? 'enabled' : 'disabled'}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.checked }}
            >
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>{item.title}</Text>
                {item.subtitle && (
                  <Text style={styles.preferenceSubtitle}>{item.subtitle}</Text>
                )}
              </View>
              {item.checked ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={Colors.text.light} />
              )}
            </TouchableOpacity>
            {index < items.length - 1 && <View style={styles.itemDivider} />}
          </React.Fragment>
        ))}
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Preferences"
        showBack
        showNotification
        darkBackground
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSection('Travel modes', travelModes, setTravelModes)}
        {renderSection('Route Priorities', routePriorities, setRoutePriorities)}
        {renderSection('Fare', fare, setFare)}
        {renderSection('Notification', notifications, setNotifications)}
      </ScrollView>
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
  section: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Theme.spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    minHeight: 51,
  },
  preferenceContent: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  preferenceTitle: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  preferenceSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins',
    fontWeight: '400',
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.text.light,
    marginVertical: Theme.spacing.xs,
  },
});

export default PreferencesScreen;
