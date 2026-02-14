import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../constants/Theme';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Card } from '../components/Card';

const UserDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState('Username');
  const [email, setEmail] = useState('username@gmail.com');
  const [address1, setAddress1] = useState('Dasmarñas, Cavite');
  const [address2, setAddress2] = useState('Washington Place');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="User Details"
        showBack
        showNotification
        onNotificationPress={() => navigation.navigate('Notifications' as never)}
      />
      <ScrollView style={styles.content}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={Colors.primary} />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="create-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.email}>{email}</Text>
        </Card>

        {/* Editable Fields */}
        <Card style={styles.fieldsCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.fieldInputContainer}>
              <Text style={styles.fieldInput}>{username}</Text>
              <TouchableOpacity>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.fieldInputContainer}>
              <Text style={styles.fieldInput}>{email}</Text>
              <TouchableOpacity>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Address</Text>
            <View style={styles.addressItem}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <Text style={styles.addressText}>{address1}</Text>
              <TouchableOpacity>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.addressItem}>
              <Ionicons name="home" size={20} color={Colors.primary} />
              <Text style={styles.addressText}>{address2}</Text>
              <TouchableOpacity>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
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
  profileCard: {
    margin: Theme.spacing.md,
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  email: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  fieldsCard: {
    margin: Theme.spacing.md,
    padding: Theme.spacing.lg,
  },
  fieldRow: {
    marginBottom: Theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Theme.spacing.sm,
  },
  fieldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.sm,
  },
  addressText: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
});

export default UserDetailsScreen;
