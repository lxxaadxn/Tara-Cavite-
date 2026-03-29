import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Theme } from '../constants/theme';
import { JamIcon } from '../components/JamIcon';
import type { JamIconName } from '../lib/jamSvgMap';
import { legacyIoniconToJam } from '../lib/legacyIoniconToJam';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';

interface RouteParams {
  listId?: string;
  listData?: {
    id: string;
    name: string;
    description?: string;
    icon_name: string;
    type: 'private' | 'shared';
  };
}

const NewListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as RouteParams) || {};
  const isEditing = !!params.listId;

  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [listType, setListType] = useState<'private' | 'shared'>('private');
  const [selectedIcon, setSelectedIcon] = useState<string>('smiley');
  const [saving, setSaving] = useState(false);

  const iconOptions: JamIconName[] = [
    'smiley',
    'heart',
    'star',
    'bookmark',
    'flag',
    'map-marker',
  ];

  useEffect(() => {
    if (isEditing && params.listData) {
      setListName(params.listData.name);
      setDescription(params.listData.description || '');
      setListType(params.listData.type);
      setSelectedIcon(legacyIoniconToJam(params.listData.icon_name));
    }
  }, [isEditing, params.listData]);

  const handleSave = async () => {
    if (!listName.trim()) {
      Alert.alert('Error', 'Please enter a list name.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save a list.');
        setSaving(false);
        return;
      }

      if (isEditing && params.listId) {
        // UPDATE: Update existing list
        const { error } = await supabase
          .from('saved_lists')
          .update({
            name: listName.trim(),
            description: description.trim(),
            type: listType,
            icon_name: selectedIcon,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.listId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating list:', error);
          throw error;
        }

        Alert.alert('Success', 'List updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        // CREATE: Create new list
        const { data, error } = await supabase
          .from('saved_lists')
          .insert({
            user_id: user.id,
            name: listName.trim(),
            description: description.trim(),
            type: listType,
            icon_name: selectedIcon,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating list:', error);
          // If table doesn't exist, show helpful message
          if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
            Alert.alert(
              'Database Error',
              'The saved_lists table does not exist. Please run the Supabase schema.sql file in your Supabase Dashboard > SQL Editor.'
            );
          } else {
            throw error;
          }
          return;
        }

        Alert.alert('Success', 'List created successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save list. Please try again.');
      console.error('Error saving list:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={isEditing ? 'Edit List' : 'New List'}
        showBack
        darkBackground
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Icon Selection */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <JamIcon ionicon={selectedIcon} size={32} color={Colors.white} />
          </View>
          <TouchableOpacity
            style={styles.addIconButton}
            onPress={() => {
              // Cycle through icons
              const normalized = legacyIoniconToJam(selectedIcon);
              const currentIndex = iconOptions.indexOf(normalized);
              const nextIndex = ((currentIndex >= 0 ? currentIndex : 0) + 1) % iconOptions.length;
              setSelectedIcon(iconOptions[nextIndex]);
            }}
            accessibilityLabel="Change icon"
            accessibilityRole="button"
          >
            <JamIcon ionicon="add-circle" size={24} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={styles.iconLabel}>Choose icon</Text>
        </View>

        {/* Name Input */}
        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="Name this list"
            placeholderTextColor={Colors.text.light}
            value={listName}
            onChangeText={setListName}
            accessibilityLabel="List name input"
            maxLength={100}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputSection}>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Description"
            placeholderTextColor={Colors.text.light}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            accessibilityLabel="List description input"
            maxLength={500}
          />
        </View>

        {/* List Type Selection */}
        <View style={styles.typeSection}>
          <Text style={styles.typeLabel}>List type</Text>
          <View style={styles.typeDivider} />

          <TouchableOpacity
            style={styles.typeOption}
            onPress={() => setListType('private')}
            accessibilityLabel="Private list type"
            accessibilityRole="radio"
            accessibilityState={{ selected: listType === 'private' }}
          >
            <View style={styles.typeContent}>
              <Text style={[styles.typeTitle, listType === 'private' && styles.typeTitleSelected]}>
                Private
              </Text>
              <Text style={styles.typeDescription}>Only you can view and edit</Text>
            </View>
            {listType === 'private' && (
              <JamIcon ionicon="checkmark" size={20} color={Colors.accent} />
            )}
          </TouchableOpacity>

          <View style={styles.typeDivider} />

          <TouchableOpacity
            style={styles.typeOption}
            onPress={() => setListType('shared')}
            accessibilityLabel="Shared list type"
            accessibilityRole="radio"
            accessibilityState={{ selected: listType === 'shared' }}
          >
            <View style={styles.typeContent}>
              <Text style={[styles.typeTitle, listType === 'shared' && styles.typeTitleSelected]}>
                Shared
              </Text>
              <Text style={styles.typeDescription}>
                Anyone with link will see this list with your account and picture
              </Text>
            </View>
            {listType === 'shared' && (
              <JamIcon ionicon="checkmark" size={20} color={Colors.accent} />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !listName.trim()}
          accessibilityLabel={isEditing ? 'Update list' : 'Save list'}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <JamIcon ionicon="checkmark-circle" size={24} color={Colors.white} />
          )}
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
          </Text>
        </TouchableOpacity>
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
  iconSection: {
    alignItems: 'center',
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.lg,
  },
  iconCircle: {
    width: 94,
    height: 90,
    borderRadius: 54.5,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  addIconButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  iconLabel: {
    fontSize: 12,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.primary,
    marginTop: Theme.spacing.xs,
  },
  inputSection: {
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.text.light,
    borderRadius: 8,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    fontSize: 12,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.primary,
    minHeight: 32,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: Theme.spacing.sm,
  },
  typeSection: {
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.light,
    marginBottom: Theme.spacing.sm,
  },
  typeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.text.light,
    marginVertical: Theme.spacing.sm,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
  },
  typeContent: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 12,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: Theme.spacing.xs,
  },
  typeTitleSelected: {
    color: Colors.accent,
  },
  typeDescription: {
    fontSize: 10,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: Colors.text.light,
  },
  saveButtonContainer: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.text.light,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
    color: Colors.white,
    marginLeft: Theme.spacing.sm,
  },
});

export default NewListScreen;
