import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/Theme';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { mockSavedLists, SavedList } from '../data/mockData';

const SavedListScreen: React.FC = () => {
  const navigation = useNavigation();

  const renderListItem = ({ item }: { item: SavedList }) => (
    <Card style={styles.listItem}>
      <View style={styles.listItemContent}>
        <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemTitle}>{item.name}</Text>
          <Text style={styles.listItemSubtitle}>
            {item.isPrivate ? 'Private list' : 'Public list'} | {item.placeCount} places
          </Text>
        </View>
        <Ionicons name="ellipse-outline" size={20} color={Colors.text.light} />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Saved List"
        showBack
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <View style={styles.content}>
        <View style={styles.buttonContainer}>
          <Button title="+ ADD NEW LIST" onPress={() => {}} />
        </View>
        <FlatList
          data={mockSavedLists}
          renderItem={renderListItem}
          keyExtractor={(item) => item.id}
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
  buttonContainer: {
    padding: Theme.spacing.md,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
  },
  listItem: {
    marginBottom: Theme.spacing.sm,
    padding: Theme.spacing.md,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Theme.spacing.xs,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});

export default SavedListScreen;
