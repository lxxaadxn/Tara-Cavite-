import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, DeviceEventEmitter } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Colors, Theme } from '../constants/theme';
import { JamIcon } from './JamIcon';
import { LogoWordmark } from './LogoWordmark';
import { supabase } from '../lib/supabase';
import { subscribeAnnouncementsChanged, unreadAnnouncementCount } from 'cavitour-shared/announcements';
import { resolveAvatarFromSources } from 'cavitour-shared/defaultAvatar';
import { AVATAR_UPDATED_EVENT } from '../lib/travelerProfile';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showNotification?: boolean;
  showLogo?: boolean;
  /** Home wordmark: Tara, Cavite! in Bebas Neue */
  homeBranding?: boolean;
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
  showFilter?: boolean;
  onFilterPress?: () => void;
  darkBackground?: boolean;
  showProfile?: boolean;
}

function navigateNamed(navigation: { getParent?: () => unknown; navigate?: (n: string) => void }, name: string) {
  let nav: { getState?: () => { routeNames?: string[] }; getParent?: () => unknown; navigate?: (n: string) => void } | undefined =
    navigation;
  while (nav) {
    const names = nav.getState?.()?.routeNames ?? [];
    if (names.includes(name) && nav.navigate) {
      nav.navigate(name);
      return;
    }
    nav = nav.getParent?.() as typeof nav;
  }
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
  showProfile = true,
}) => {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const [unread, setUnread] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (!showNotification) return;
    let cancelled = false;
    const loadUnread = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) {
        if (!cancelled) setUnread(0);
        return;
      }
      try {
        const count = await unreadAnnouncementCount(supabase, userId);
        if (!cancelled) setUnread(count);
      } catch {
        if (!cancelled) setUnread(0);
      }
    };
    if (focused) void loadUnread();
    const unsubscribe = subscribeAnnouncementsChanged(() => {
      void loadUnread();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [showNotification, focused]);

  useEffect(() => {
    if (!showProfile) return;
    let cancelled = false;
    const loadAvatar = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        if (!cancelled) setAvatarUri(null);
        return;
      }
      const { data: row } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setAvatarUri(
        resolveAvatarFromSources(row as { avatar_url?: string | null }, user.user_metadata ?? {})
      );
    };
    if (focused) void loadAvatar();
    const sub = DeviceEventEmitter.addListener(AVATAR_UPDATED_EVENT, () => {
      void loadAvatar();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [showProfile, focused]);

  const openProfile = () => navigateNamed(navigation, 'Profile');
  const openAnnouncements = () => {
    if (onNotificationPress) {
      onNotificationPress();
      return;
    }
    navigateNamed(navigation, 'Announcements');
  };

  const headerStyle = darkBackground ? styles.darkHeader : styles.lightHeader;
  const textColor = darkBackground ? Colors.white : Colors.primary;
  const iconColor = darkBackground ? Colors.white : Colors.primary;

  const profileBtn =
    showProfile ? (
      <TouchableOpacity
        onPress={openProfile}
        style={styles.avatarBtn}
        accessibilityLabel="Open profile"
        accessibilityRole="button"
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <JamIcon ionicon="person-outline" size={18} color={Colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    ) : null;

  const bellBtn = showNotification ? (
    <TouchableOpacity
      onPress={openAnnouncements}
      style={styles.iconButton}
      accessibilityLabel={unread > 0 ? `View announcements, ${unread} unread` : 'View announcements'}
      accessibilityRole="button"
    >
      <JamIcon ionicon="notifications-outline" size={26} color={homeBranding ? Colors.primary : iconColor} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  ) : null;

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
            <View style={styles.rightGroup}>
              {bellBtn}
              {profileBtn}
            </View>
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
        <View style={styles.headerBrand}>
          <LogoWordmark markSize={28} wordFontSize={22} />
        </View>
      ) : (
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      )}
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
        {bellBtn}
        {profileBtn}
      </View>
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
  headerBrand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8ECEF',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#E76365',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 12,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.6,
  },
  wordmarkAccent: {
    color: Colors.cta,
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
