import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, DeviceEventEmitter } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { JamIcon } from './JamIcon';
import { supabase } from '../lib/supabase';
import { navigateNamed } from '../lib/navigateNamed';
import { AVATAR_UPDATED_EVENT } from '../lib/travelerProfile';
import { resolveAvatarFromSources } from 'cavitour-shared/defaultAvatar';
import { subscribeAnnouncementsChanged, unreadAnnouncementCount } from 'cavitour-shared/announcements';

export type HeaderIconClusterProps = {
  /** Bell — unread announcements, opens the Notifications screen. */
  showBell?: boolean;
  /** Signed-in traveler avatar, opens Profile. */
  showProfile?: boolean;
  tint?: string;
};

/** Bell + avatar row shared by the home header and the teal app bar. */
export const HeaderIconCluster: React.FC<HeaderIconClusterProps> = ({
  showBell = true,
  showProfile = true,
  tint = Colors.primary,
}) => {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const [unread, setUnread] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (!showBell) return;
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
  }, [showBell, focused]);

  useEffect(() => {
    if (!showProfile) return;
    let cancelled = false;
    const loadAvatar = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const u = data.user;
        if (!u) {
          if (!cancelled) setAvatarUri(null);
          return;
        }
        const { data: row } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('id', u.id)
          .maybeSingle();
        if (!cancelled) {
          setAvatarUri(
            resolveAvatarFromSources(
              row as { avatar_url?: string | null },
              (u.user_metadata ?? {}) as Record<string, unknown>
            )
          );
        }
      } catch {
        if (!cancelled) setAvatarUri(null);
      }
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

  return (
    <View style={styles.row}>
      {showBell ? (
        <TouchableOpacity
          onPress={() => navigateNamed(navigation, 'Notifications')}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={
            unread > 0 ? `View notifications, ${unread} unread` : 'View notifications'
          }
        >
          <JamIcon ionicon="notifications-outline" size={24} color={tint} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {showProfile ? (
        <TouchableOpacity
          onPress={() => navigateNamed(navigation, 'Profile')}
          style={styles.avatarButton}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <View style={styles.avatarRing}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <JamIcon ionicon="person" size={18} color={Colors.primary} />
            )}
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
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
  avatarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: '#E8EEEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
