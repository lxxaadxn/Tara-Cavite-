import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { mockNotifications, Notification } from '../data/mockData';

interface GroupedNotification {
  group: string;
  notifications: Notification[];
  timeLabel?: string;
}

const NotificationsScreen: React.FC = () => {
  const [showFilter, setShowFilter] = useState(false);

  // Group notifications by date
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
  ].filter((group) => group.notifications.length > 0);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'traffic':
        return { name: 'alert-circle', color: '#F44336' };
      case 'arrival':
        return { name: 'location', color: Colors.accent };
      case 'route-change':
        return { name: 'swap-horizontal', color: Colors.primary };
      default:
        return { name: 'notifications', color: Colors.primary };
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityLabel={`${item.title}, ${item.message}`}
        accessibilityRole="button"
      >
        <Card style={styles.notificationCard}>
          <View style={styles.notificationContent}>
            <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
              <Ionicons name={icon.name as any} size={30} color={icon.color} />
            </View>
            <View style={styles.notificationText}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationMessage}>{item.message}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item }: { item: GroupedNotification }) => (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{item.group}</Text>
        {item.timeLabel && <Text style={styles.groupTime}>{item.timeLabel}</Text>}
      </View>
      {item.notifications.map((notification) => (
        <View key={notification.id}>{renderNotification({ item: notification })}</View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Notifications"
        showBack
        darkBackground
      />
      <View style={styles.content}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilter(!showFilter)}
            accessibilityLabel="Filter notifications"
            accessibilityRole="button"
            accessibilityExpanded={showFilter}
          >
            <Ionicons name="filter" size={16} color={Colors.text.primary} />
            <Text style={styles.filterText}>Filter</Text>
            <Ionicons
              name={showFilter ? 'chevron-up' : 'chevron-down'}
              size={11}
              color={Colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {showFilter && (
          <View style={styles.filterDropdown}>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowFilter(false)}
              accessibilityLabel="Filter by today"
              accessibilityRole="button"
            >
              <Text style={styles.filterOptionText}>Today</Text>
            </TouchableOpacity>
            <View style={styles.filterDivider} />
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowFilter(false)}
              accessibilityLabel="Filter by yesterday"
              accessibilityRole="button"
            >
              <Text style={styles.filterOptionText}>Yesterday</Text>
            </TouchableOpacity>
            <View style={styles.filterDivider} />
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowFilter(false)}
              accessibilityLabel="Filter by last month"
              accessibilityRole="button"
            >
              <Text style={styles.filterOptionText}>Last month</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={groupedNotifications}
          renderItem={renderGroup}
          keyExtractor={(item) => item.group}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  filterContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'flex-end',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  filterText: {
    marginLeft: 7,
    marginRight: 7,
    fontSize: 15,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.primary,
  },
  filterDropdown: {
    backgroundColor: Colors.white,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  filterOption: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  filterOptionText: {
    fontSize: 12,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  filterDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.text.light,
    marginHorizontal: Theme.spacing.sm,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
  },
  group: {
    marginBottom: Theme.spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  groupTitle: {
    fontSize: 20,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.primary,
  },
  groupTime: {
    fontSize: 11,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  notificationCard: {
    backgroundColor: Colors.white,
    borderRadius: 9,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  notificationMessage: {
    fontSize: 11,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.secondary,
    lineHeight: 16,
  },
});

export default NotificationsScreen;
