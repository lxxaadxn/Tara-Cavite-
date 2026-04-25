import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { Colors, Theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

interface SavedList {
  id: string;
  name: string;
  description?: string;
  icon_name: string;
  type: 'private' | 'shared';
  place_count: number;
  created_at?: string;
  updated_at?: string;
}

const SavedListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [lists, setLists] = useState<SavedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLists = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLists([]);
        return;
      }

      const { data, error } = await supabase
        .from('saved_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading lists:', error);
        // Fallback to empty array if table doesn't exist yet
        setLists([]);
        return;
      }

      setLists(data || []);
    } catch (error) {
      console.error('Error loading lists:', error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadLists();
    }, [])
  );

  const handleDelete = (list: SavedList) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(list.id);
            try {
              const { error } = await supabase
                .from('saved_lists')
                .delete()
                .eq('id', list.id);

              if (error) throw error;

              // Remove from local state
              setLists(lists.filter((l) => l.id !== list.id));
              Alert.alert('Success', 'List deleted successfully.');
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Error', 'Failed to delete list. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (list: SavedList) => {
    navigation.navigate('NewList', { listId: list.id, listData: list });
  };

  const getIconColor = (iconName: string): string => {
    const colorMap: { [key: string]: string } = {
      bookmark: '#9C27B0',
      'bookmark-outline': '#9C27B0',
      star: '#FFC107',
      'star-outline': '#FFC107',
      heart: '#F44336',
      'heart-outline': '#F44336',
      business: '#2196F3',
      flag: '#1B4D4D',
      'flag-outline': '#1B4D4D',
      happy: Colors.accent,
      'happy-outline': Colors.accent,
      smiley: Colors.accent,
      location: Colors.primary,
      'location-outline': Colors.primary,
      'map-marker': Colors.primary,
    };
    return colorMap[iconName] || Colors.primary;
  };

  const renderListItem = ({ item }: { item: SavedList }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleEdit(item)}
      onLongPress={() => handleDelete(item)}
      accessibilityLabel={`${item.name}, ${item.type === 'private' ? 'Private' : 'Shared'} list with ${item.place_count} places`}
      accessibilityRole="button"
      accessibilityHint="Long press to delete"
    >
      <View style={styles.listItem}>
        <View style={styles.listItemContent}>
          <JamIcon
            ionicon={item.icon_name}
            size={25}
            color={getIconColor(item.icon_name)}
          />
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemTitle}>{item.name}</Text>
            <Text style={styles.listItemSubtitle}>
              {item.type === 'private' ? 'Private list' : 'Shared list'} | {item.place_count} places
            </Text>
          </View>
          <View style={styles.listItemActions}>
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color={Colors.text.secondary} />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(item)}
                  accessibilityLabel={`Edit ${item.name}`}
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="create-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(item)}
                  accessibilityLabel={`Delete ${item.name}`}
                  accessibilityRole="button"
                >
                  <JamIcon ionicon="trash-outline" size={20} color="#F44336" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header
          title="Saved List"
          showBack
          showNotification
          darkBackground
          onNotificationPress={() => navigation.navigate('Notifications')}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading lists...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Saved List"
        showBack
        showNotification
        darkBackground
        onNotificationPress={() => navigation.navigate('Notifications')}
      />
      <View style={styles.content}>
        <View style={styles.buttonContainer}>
          <Button
            title="+ ADD NEW LIST"
            onPress={() => navigation.navigate('NewList')}
            accessibilityLabel="Create new list"
          />
        </View>
        {lists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <JamIcon ionicon="list-outline" size={64} color={Colors.text.light} />
            <Text style={styles.emptyText}>No saved lists yet</Text>
            <Text style={styles.emptySubtext}>Create your first list to get started!</Text>
          </View>
        ) : (
          <FlatList
            data={lists}
            renderItem={renderListItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: 16,
    fontFamily: 'Poppins',
    color: Colors.text.secondary,
  },
  buttonContainer: {
    padding: Theme.spacing.md,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Theme.spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins',
    color: Colors.text.secondary,
    marginTop: Theme.spacing.xs,
  },
  listItem: {
    backgroundColor: Colors.white,
    borderRadius: 0,
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.sm,
  },
  listItemInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  listItemTitle: {
    fontSize: 14,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  listItemSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  listItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  actionButton: {
    padding: Theme.spacing.xs,
  },
});

export default SavedListScreen;
