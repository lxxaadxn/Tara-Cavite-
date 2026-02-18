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
  timeLabel?: string;
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
      timeLabel: '53mins',
    },
    {
      group: 'Yesterday',
      routes: mockRoutes.filter((r) => r.date === '2026-02-12'),
      timeLabel: '13hrs',
    },
    {
      group: 'Last month',
      routes: mockRoutes.filter((r) => r.date < '2026-02-12'),
      timeLabel: 'Jan 1',
    },
  ].filter((group) => group.routes.length > 0);

  const filteredRoutes = selectedFilter === 'all'
    ? groupedRoutes
    : groupedRoutes.filter((g) => {
        if (selectedFilter === 'today') return g.group === 'Today';
        if (selectedFilter === 'yesterday') return g.group === 'Yesterday';
        if (selectedFilter === 'last-month') return g.group === 'Last month';
        return true;
      });

  const renderRouteItem = ({ item }: { item: Route }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityLabel={`${item.name}, Departed ${item.departureTime}, Duration ${item.duration}`}
      accessibilityRole="button"
    >
      <View style={styles.routeCard}>
        <View style={styles.routeContent}>
          <Ionicons name="time-outline" size={24} color={Colors.primary} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{item.name}</Text>
            <Text style={styles.routeMeta}>
              Departed {item.departureTime} | {item.duration}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={Colors.text.light} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGroup = ({ item }: { item: GroupedRoute }) => (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{item.group}</Text>
        {item.timeLabel && <Text style={styles.groupDuration}>{item.timeLabel}</Text>}
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
        darkBackground
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <View style={styles.content}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilter(!showFilter)}
            accessibilityLabel="Filter history"
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
              onPress={() => {
                setSelectedFilter('today');
                setShowFilter(false);
              }}
              accessibilityLabel="Filter by today"
              accessibilityRole="button"
            >
              <Text style={styles.filterOptionText}>Today</Text>
            </TouchableOpacity>
            <View style={styles.filterDivider} />
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedFilter('yesterday');
                setShowFilter(false);
              }}
              accessibilityLabel="Filter by yesterday"
              accessibilityRole="button"
            >
              <Text style={styles.filterOptionText}>Yesterday</Text>
            </TouchableOpacity>
            <View style={styles.filterDivider} />
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                setSelectedFilter('last-month');
                setShowFilter(false);
              }}
              accessibilityLabel="Filter by last month"
              accessibilityRole="button"
            >
              <Text style={styles.filterOptionText}>Last month</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filteredRoutes}
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
  groupDuration: {
    fontSize: 11,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  routeCard: {
    backgroundColor: Colors.white,
    borderRadius: 0,
    paddingVertical: 9,
    paddingHorizontal: 20,
    marginBottom: Theme.spacing.xs,
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
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  routeMeta: {
    fontSize: 11,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.secondary,
  },
});

export default HistoryScreen;
