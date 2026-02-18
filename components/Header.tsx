import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Theme } from '../constants/theme';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showNotification?: boolean;
  showLogo?: boolean;
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
  darkBackground?: boolean; // For dark teal background headers
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  showNotification = false,
  showLogo = false,
  onNotificationPress,
  onMenuPress,
  darkBackground = false,
}) => {
  const navigation = useNavigation();

  const headerStyle = darkBackground ? styles.darkHeader : styles.lightHeader;
  const textColor = darkBackground ? Colors.white : Colors.primary;
  const iconColor = darkBackground ? Colors.white : Colors.primary;

  return (
    <View style={[styles.container, headerStyle]}>
      {showBack ? (
        <TouchableOpacity
          onPress={onBackPress ?? (() => navigation.goBack())}
          style={styles.iconButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={iconColor} />
        </TouchableOpacity>
      ) : showLogo && onMenuPress ? (
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.iconButton}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={29} color={iconColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
      {showLogo ? (
        <Image
          source={require('../assets/images/cavitour-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="CaviTour logo"
        />
      ) : (
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      )}
      {showNotification ? (
        <TouchableOpacity
          onPress={onNotificationPress}
          style={styles.iconButton}
          accessibilityLabel="View notifications"
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={28} color={iconColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lightHeader: {
    backgroundColor: Colors.white,
  },
  darkHeader: {
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  logo: {
    height: 36,
    width: 160,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
