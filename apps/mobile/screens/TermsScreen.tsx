import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';

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
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Header title="Terms of Use" showBack darkBackground />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
