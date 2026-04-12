import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import type { JamIconName } from '../lib/jamSvgMap';
import { mockNotifications, Notification } from '../data/mockData';

const HEADER_GREEN = '#7EA00E';
const DATE_TEAL = '#1F4F59';
const MUTED = '#7A7878';
const ALERT_RED = '#E76365';
const H_PAD = 16;

interface GroupedNotification {
  group: string;
  notifications: Notification[];
  timeLabel: string;
}

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const groupedNotifications: GroupedNotification[] = [
    {
      group: 'Today',
      notifications: mockNotifications.filter((n) => n.date === '2026-02-13'),
      timeLabel: '53mins',
    },
    {
      group: 'Yesterday',
      notifications: mockNotifications.filter((n) => n.date === '2026-02-12'),
      timeLabel: '13hrs',
    },
  ].filter((g) => g.notifications.length > 0);

  const getNotificationIcon = (type: string): { name: JamIconName; color: string } => {
    switch (type) {
      case 'traffic':
        return { name: 'alert', color: ALERT_RED };
      case 'arrival':
        return { name: 'map-marker', color: HEADER_GREEN };
      case 'route-change':
        return { name: 'compass', color: DATE_TEAL };
      default:
        return { name: 'bell', color: DATE_TEAL };
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />
      <View style={[styles.greenHeader, { paddingTop: insets.top + 10, paddingBottom: 14 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerSide}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <JamIcon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} pointerEvents="none">
            Notifications
          </Text>
          <View style={styles.headerSide} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {groupedNotifications.map((item) => (
          <View key={item.group} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{item.group}</Text>
              <Text style={styles.groupTime}>{item.timeLabel}</Text>
            </View>
            {item.notifications.map((n) => {
              const icon = getNotificationIcon(n.type);
              return (
                <TouchableOpacity
                  key={n.id}
                  activeOpacity={0.85}
                  style={styles.card}
                  accessibilityLabel={`${n.title}, ${n.message}`}
                  accessibilityRole="button"
                >
                  <View style={styles.iconSlot}>
                    <JamIcon name={icon.name} size={20} color={icon.color} />
                  </View>
                  <View style={styles.textBlock}>
                    <Text style={styles.cardTitle}>{n.title}</Text>
                    <Text style={styles.cardBody}>{n.message}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  greenHeader: {
    backgroundColor: HEADER_GREEN,
    paddingHorizontal: H_PAD,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 18,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 28,
  },
  group: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 17,
    lineHeight: 22,
    color: DATE_TEAL,
  },
  groupTime: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: MUTED,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 2,
    elevation: 2,
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
    paddingTop: 1,
    marginRight: 8,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#000000',
    marginBottom: 2,
  },
  cardBody: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: MUTED,
  },
});

export default NotificationsScreen;
