import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, HeaderAction } from '../components/Header';
import { JamIcon } from '../components/JamIcon';

const GREEN = '#10A37F';
const TEAL = '#1B8A70';
const WHITE = '#FFFFFF';
const SECTION_LABEL = '#7A7878';
const TITLE = '#000000';
const SUBTITLE = '#7A7878';

interface ToggleItem {
  id: string;
  title: string;
  subtitle?: string;
  checked: boolean;
}

const PreferencesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [travelModes, setTravelModes] = useState<ToggleItem[]>([
    { id: 'bus', title: 'Bus', checked: true },
    { id: 'jeepney', title: 'Jeepney', checked: true },
    { id: 'walking', title: 'Walking', checked: false },
  ]);

  const [routePriorities, setRoutePriorities] = useState<ToggleItem[]>([
    { id: 'avoid-traffic', title: 'Avoid Traffic', checked: true },
    {
      id: 'direct',
      title: 'Direct route',
      subtitle:
        'Prioritizes single-ride bus or jeepney routes to minimize transfers and boarding frequency.',
      checked: true,
    },
  ]);

  const [notifications, setNotifications] = useState<ToggleItem[]>([
    { id: 'allow', title: 'Allow to send notification', checked: true },
    {
      id: 'arrival',
      title: 'Arrival Alert',
      subtitle: 'Notify me when I am 2 minutes away from my stop',
      checked: true,
    },
  ]);

  const toggleInList = (setItems: React.Dispatch<React.SetStateAction<ToggleItem[]>>, id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const onSaveHeader = () => {
    Alert.alert('Saved', 'Your preferences have been updated.');
  };

  return (
    <View style={styles.root}>
      <Header
        title="Preferences"
        showBack
        darkBackground
        right={
          <HeaderAction onPress={onSaveHeader} accessibilityLabel="Save preferences">
            <JamIcon ionicon="checkmark" size={24} color={WHITE} />
          </HeaderAction>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeading}>Travel Modes</Text>
        <View style={[styles.card, styles.travelCard]}>
          {travelModes.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 ? <View style={styles.hairline} /> : null}
              <TouchableOpacity
                style={styles.travelRow}
                onPress={() => toggleInList(setTravelModes, item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.checked }}
                accessibilityLabel={`${item.title}, ${item.checked ? 'on' : 'off'}`}
              >
                <Text style={styles.optionTitle}>{item.title}</Text>
                {item.checked ? (
                  <JamIcon ionicon="checkmark" size={20} color={TEAL} />
                ) : (
                  <JamIcon ionicon="ellipse-outline" size={20} color="rgba(122,120,120,0.45)" />
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.sectionHeading}>Route Priorities</Text>
        {routePriorities.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, styles.cardStandalone, item.subtitle ? styles.cardPadTall : styles.cardPadShort]}
            onPress={() => toggleInList(setRoutePriorities, item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.checked }}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardTextBlock}>
                <Text style={styles.optionTitle}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.optionSubtitle}>{item.subtitle}</Text> : null}
              </View>
              <View style={styles.rowCheck}>
                {item.checked ? (
                  <JamIcon ionicon="checkmark" size={22} color={GREEN} />
                ) : (
                  <JamIcon ionicon="ellipse-outline" size={22} color="rgba(122,120,120,0.45)" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionHeading}>Notification</Text>
        {notifications.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, styles.cardStandalone, item.subtitle ? styles.cardPadTall : styles.cardPadShort]}
            onPress={() => toggleInList(setNotifications, item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.checked }}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardTextBlock}>
                <Text style={styles.optionTitle}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.optionSubtitle}>{item.subtitle}</Text> : null}
              </View>
              <View style={styles.rowCheck}>
                {item.checked ? (
                  <JamIcon ionicon="checkmark" size={22} color={TEAL} />
                ) : (
                  <JamIcon ionicon="ellipse-outline" size={22} color="rgba(122,120,120,0.45)" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.12,
  shadowRadius: 3,
  elevation: 3,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WHITE,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: SECTION_LABEL,
    marginBottom: 10,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    overflow: 'hidden',
    ...cardShadow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 120, 120, 0.15)',
  },
  travelCard: {
    marginBottom: 22,
  },
  cardStandalone: {
    marginBottom: 12,
  },
  cardPadShort: {
    paddingVertical: 14,
    paddingHorizontal: 19,
  },
  cardPadTall: {
    paddingVertical: 12,
    paddingHorizontal: 19,
  },
  travelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 17,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(215, 215, 215, 1)',
    marginHorizontal: 17,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  rowCheck: {
    marginLeft: 12,
    paddingTop: 2,
  },
  optionTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: TITLE,
  },
  optionSubtitle: {
    marginTop: 7,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: SUBTITLE,
  },
});

export default PreferencesScreen;
