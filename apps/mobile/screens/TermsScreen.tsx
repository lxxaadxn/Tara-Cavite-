import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JamIcon } from '../components/JamIcon';

const PAGE_BG = '#f4f7f9';
const TITLE = '#171717';
const MUTED = '#737373';

const SECTIONS = [
  {
    title: 'Who these terms cover',
    body: 'Tara, Cavite! is a travel companion for exploring Cavite. These terms apply when you create an account, use maps and itineraries, save places, check in, or read announcements.',
  },
  {
    title: 'Your account',
    body: 'Keep your password private and use a working email. You are responsible for activity on your account. The Tourism Office email cannot be used for traveler signup.',
  },
  {
    title: 'What the app provides',
    body: 'Listings, routes, and itineraries are planning guides, not guarantees. Hours, fees, and road conditions can change. Navigation may open Google Maps under its own terms.',
  },
  {
    title: 'Check-ins and reviews',
    body: 'Check-ins should reflect a real visit. Reviews must be your own honest experience. Do not post abuse, spam, or other people’s private information.',
  },
  {
    title: 'Acceptable use',
    body: 'Do not scrape the catalog, interfere with the service, or impersonate the Tourism Office. Accounts that break these rules may be suspended.',
  },
];

export default function TermsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.titleRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
        >
          <JamIcon ionicon="chevron-left" size={22} color={TITLE} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Terms of Use</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.heading}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
    paddingHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -6,
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: TITLE,
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    marginBottom: 12,
  },
  heading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: TITLE,
  },
  body: {
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
});
