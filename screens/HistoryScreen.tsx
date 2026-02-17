import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { mockRoutes, Route } from '../data/mockData';

interface GroupedRoute {
  group: string;
  routes: Route[];
}

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [showFilter, setShowFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Group routes by date
  const groupedRoutes: GroupedRoute[] = [
    {
      group: 'Today',
      routes: mockRoutes.filter((r) => r.date === '2026-02-13'),
    },
    {
      group: 'Yesterday',
      routes: mockRoutes.filter((r) => r.date === '2026-02-12'),
    },
    {
      group: 'Last month',
      routes: mockRoutes.filter((r) => r.date < '2026-02-12'),
    },
  ].filter((group) => group.routes.length > 0);

  const renderRouteItem = ({ item }: { item: Route }) => (
    <TouchableOpacity>
      <Card style={styles.routeCard}>
        <View style={styles.routeContent}>
          <Ionicons name="time" size={24} color={Colors.primary} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{item.name}</Text>
            <Text style={styles.routeMeta}>
              Departed {item.departureTime} | {item.duration}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.light} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderGroup = ({ item }: { item: GroupedRoute }) => (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{item.group}</Text>
        {item.group === 'Yesterday' && (
          <Text style={styles.groupDuration}>13hrs</Text>
        )}
        {item.group === 'Today' && (
          <Text style={styles.groupDuration}>53mins</Text>
        )}
      </View>
      {item.routes.map((route) => (
        <View key={route.id}>{renderRouteItem({ item: route })}</View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="History"
        showBack
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
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
              onPress={() => {
                setSelectedFilter('today');
                setShowFilter(false);
              }}
            >
              <Text style={styles.filterOptionText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedFilter('yesterday');
                setShowFilter(false);
              }}
            >
              <Text style={styles.filterOptionText}>Yesterday</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedFilter('last-month');
                setShowFilter(false);
              }}
            >
              <Text style={styles.filterOptionText}>Last month</Text>
            </TouchableOpacity>
          </Card>
        )}

        <FlatList
          data={groupedRoutes}
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
  groupDuration: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  routeCard: {
    marginBottom: Theme.spacing.sm,
    padding: Theme.spacing.md,
  },
  routeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  routeMeta: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});

export default HistoryScreen;
