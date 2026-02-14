import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/Theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { mockNotifications, Notification } from '../data/mockData';

interface GroupedNotification {
  group: string;
  notifications: Notification[];
}

const NotificationsScreen: React.FC = () => {
  const [showFilter, setShowFilter] = useState(false);

  // Group notifications by date
  const groupedNotifications: GroupedNotification[] = [
    {
      group: 'Today',
      notifications: mockNotifications.filter((n) => n.date === '2026-02-13'),
    },
    {
      group: 'Yesterday',
      notifications: mockNotifications.filter((n) => n.date === '2026-02-12'),
    },
  ].filter((group) => group.notifications.length > 0);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'traffic':
        return 'alert-circle';
      case 'arrival':
        return 'location';
      case 'route-change':
        return 'swap-horizontal';
      default:
        return 'notifications';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <Card style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <Ionicons
          name={getNotificationIcon(item.type) as any}
          size={24}
          color={Colors.primary}
        />
        <Text style={styles.notificationTitle}>{item.title}</Text>
      </View>
      <Text style={styles.notificationMessage}>{item.message}</Text>
    </Card>
  );

  const renderGroup = ({ item }: { item: GroupedNotification }) => (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{item.group}</Text>
        {item.group === 'Today' && (
          <Text style={styles.groupTime}>53mins</Text>
        )}
        {item.group === 'Yesterday' && (
          <Text style={styles.groupTime}>13hrs</Text>
        )}
      </View>
      {item.notifications.map((notification) => (
        <View key={notification.id}>
          {renderNotification({ item: notification })}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Notifications" showBack showNotification={false} />
      <View style={styles.content}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilter(!showFilter)}
          >
            <Ionicons name="filter" size={20} color={Colors.primary} />
            <Text style={styles.filterText}>Filter</Text>
            <Ionicons
              name={showFilter ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {showFilter && (
          <Card style={styles.filterDropdown}>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowFilter(false)}
            >
              <Text style={styles.filterOptionText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowFilter(false)}
            >
              <Text style={styles.filterOptionText}>Yesterday</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setShowFilter(false)}
            >
              <Text style={styles.filterOptionText}>Last month</Text>
            </TouchableOpacity>
          </Card>
        )}

        <FlatList
          data={groupedNotifications}
          renderItem={renderGroup}
          keyExtractor={(item) => item.group}
          contentContainerStyle={styles.listContent}
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
  },
  filterText: {
    marginLeft: Theme.spacing.xs,
    marginRight: Theme.spacing.xs,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  filterDropdown: {
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  filterOption: {
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  filterOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  groupTime: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  notificationCard: {
    marginBottom: Theme.spacing.sm,
    padding: Theme.spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: Theme.spacing.sm,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});

export default NotificationsScreen;
