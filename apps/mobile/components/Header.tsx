import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Theme } from '../constants/theme';
import { JamIcon } from './JamIcon';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showNotification?: boolean;
  showLogo?: boolean;
  /** Home wordmark: Tara, Cavite! in Pacifico; bell + filter in gray circle */
  homeBranding?: boolean;
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
  showFilter?: boolean;
  onFilterPress?: () => void;
  darkBackground?: boolean; // For dark teal background headers
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  showNotification = false,
  showLogo = false,
  homeBranding = false,
  onNotificationPress,
  onMenuPress,
  showFilter = false,
  onFilterPress,
  darkBackground = false,
}) => {
  const navigation = useNavigation();

  const headerStyle = darkBackground ? styles.darkHeader : styles.lightHeader;
  const textColor = darkBackground ? Colors.white : Colors.primary;
  const iconColor = darkBackground ? Colors.white : Colors.primary;

  if (homeBranding) {
    return (
      <View style={[styles.container, styles.lightHeader, styles.homeHeader]}>
        <View style={styles.homeHeaderRow}>
          <View
            style={styles.wordmarkRow}
            accessible
            accessibilityRole="header"
            accessibilityLabel="Tara, Cavite!"
          >
            <Text style={styles.wordmark}>
              <Text style={styles.wordmarkAccent}>Tara</Text>
              <Text style={styles.wordmarkPrimary}>, Cavite!</Text>
            </Text>
          </View>
          <View style={styles.homeRightColumn}>
            {showNotification ? (
              <TouchableOpacity
                onPress={onNotificationPress}
                style={styles.iconButton}
                accessibilityLabel="View notifications"
                accessibilityRole="button"
              >
                <JamIcon ionicon="notifications-outline" size={28} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
            {showFilter ? (
              <TouchableOpacity
                onPress={onFilterPress}
                style={styles.filterCircle}
                accessibilityLabel="Open filters"
                accessibilityRole="button"
              >
                <JamIcon ionicon="options-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, headerStyle]}>
      {showBack ? (
        <TouchableOpacity
          onPress={onBackPress ?? (() => navigation.goBack())}
          style={styles.iconButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <JamIcon
            ionicon="arrow-back"
            size={26}
            color={darkBackground ? '#FFFFFF' : iconColor}
          />
        </TouchableOpacity>
      ) : showLogo && onMenuPress ? (
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.iconButton}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <JamIcon ionicon="menu" size={29} color={iconColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
      {showLogo ? (
        <Image
          source={require('../assets/images/cavitour-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Tara, Cavite! logo"
        />
      ) : (
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      )}
      {showNotification ? (
        <View style={styles.rightGroup}>
          {showFilter ? (
            <TouchableOpacity
              onPress={onFilterPress}
              style={styles.iconButton}
              accessibilityLabel="Open filters"
              accessibilityRole="button"
            >
              <JamIcon ionicon="filter" size={24} color={iconColor} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={onNotificationPress}
            style={styles.iconButton}
            accessibilityLabel="View notifications"
            accessibilityRole="button"
          >
            <JamIcon ionicon="notifications-outline" size={28} color={iconColor} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.rightGroup}>
          {showFilter ? (
            <TouchableOpacity
              onPress={onFilterPress}
              style={styles.iconButton}
              accessibilityLabel="Open filters"
              accessibilityRole="button"
            >
              <JamIcon ionicon="filter" size={24} color={iconColor} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>
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
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  homeHeader: {
    paddingTop: 18,
    paddingBottom: 8,
  },
  homeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  wordmark: {
    fontFamily: 'Pacifico_400Regular',
    fontSize: 30,
    lineHeight: 36,
  },
  wordmarkAccent: {
    color: Colors.accent,
  },
  wordmarkPrimary: {
    color: Colors.primary,
  },
  homeRightColumn: {
    alignItems: 'flex-end',
    gap: 10,
  },
  filterCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
