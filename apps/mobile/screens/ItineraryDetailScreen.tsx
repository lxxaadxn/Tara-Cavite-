import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import {
  mockItineraries,
  getItineraryEstablishments,
  resolveItineraryEstablishment,
  type Place,
} from '../data/mockData';

const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const TITLE = '#241D13';
const MUTED = '#7A7878';
const PAGE_BG = '#F4F6EC';
const WHITE = '#FFFFFF';
const H_PAD = 16;
const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_W * 0.48);

export type ItineraryDetailParams = {
  itineraryId: string;
};

export default function ItineraryDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { itineraryId } = route.params as ItineraryDetailParams;

  const it = useMemo(
    () => mockItineraries.find((x) => x.id === itineraryId),
    [itineraryId]
  );
  const linkedPlaces = useMemo(
    () => (it ? getItineraryEstablishments(it.id) : []),
    [it]
  );

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as { navigate: (n: string) => void }).navigate('ItinerariesMain');
    }
  };

  if (!it) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />
        <View style={[styles.greenHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.headerSide}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <JamIcon name="chevron-left" size={26} color={WHITE} />
            </TouchableOpacity>
            <Text style={styles.headerTitleCenter}>Itinerary</Text>
            <View style={styles.headerSide} />
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Not found</Text>
          <Text style={styles.emptyBody}>This itinerary is no longer available.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onBack} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Back to itineraries</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stopCount = it.stopList?.length ?? it.stops ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />
      <View style={[styles.greenHeader, { paddingTop: insets.top + 8, paddingBottom: 14 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerSide}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <JamIcon name="chevron-left" size={26} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitleCenter} numberOfLines={1}>
            {it.title}
          </Text>
          <View style={styles.headerSide} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Image source={it.image} style={styles.heroImg} resizeMode="cover" accessibilityLabel="" />
          <View style={styles.heroTextBlock}>
            {it.tags?.length ? (
              <View style={styles.tagRow}>
                {it.tags.map((t) => (
                  <View key={t} style={styles.heroTag}>
                    <Text style={styles.heroTagText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.heroTitle}>{it.title}</Text>
            <Text style={styles.heroSubtitle}>{it.subtitle}</Text>
            <View style={styles.pillRow}>
              {stopCount > 0 ? (
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{stopCount} stops</Text>
                </View>
              ) : null}
              {it.durationLabel ? (
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{it.durationLabel}</Text>
                </View>
              ) : null}
              {it.bestTime ? (
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillText} numberOfLines={1}>
                    {it.bestTime}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {it.summary ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.body}>{it.summary}</Text>
            {it.highlights?.length ? (
              <View style={styles.highlightList}>
                {it.highlights.map((h) => (
                  <View key={h} style={styles.highlightRow}>
                    <Text style={styles.checkMark}>✓</Text>
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {it.stopList?.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Route & stops</Text>
            {it.stopList.map((stop, i) => {
              const est = stop.establishment
                ? resolveItineraryEstablishment(stop.establishment)
                : undefined;
              return (
                <View key={`${stop.name}-${i}`} style={styles.stopBlock}>
                  <View style={styles.stopHeader}>
                    <View style={styles.stopNum}>
                      <Text style={styles.stopNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stopName}>{stop.name}</Text>
                  </View>
                  <Text style={styles.stopDesc}>{stop.description}</Text>
                  {stop.leg ? (
                    <View style={styles.legBox}>
                      <JamIcon ionicon="navigate-outline" size={16} color={TEAL} />
                      <Text style={styles.legText}>{stop.leg}</Text>
                    </View>
                  ) : null}
                  {est ? (
                    <TouchableOpacity
                      style={styles.estRow}
                      activeOpacity={0.88}
                      onPress={() =>
                        (navigation as { navigate: (n: string, o: object) => void }).navigate(
                          'AboutEstablishment',
                          { place: est }
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${est.name}`}
                    >
                      {est.image ? (
                        <Image source={est.image} style={styles.estThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.estThumb, styles.estThumbPlaceholder]}>
                          <JamIcon ionicon="business" size={22} color={TEAL} />
                        </View>
                      )}
                      <View style={styles.estTextCol}>
                        <Text style={styles.estLabel}>Featured spot</Text>
                        <Text style={styles.estName} numberOfLines={2}>
                          {est.name}
                        </Text>
                        {est.address ? (
                          <Text style={styles.estAddr} numberOfLines={2}>
                            {est.address}
                          </Text>
                        ) : null}
                      </View>
                      <JamIcon ionicon="chevron-forward" size={20} color={MUTED} />
                    </TouchableOpacity>
                  ) : null}
                  {i < it.stopList!.length - 1 ? <View style={styles.stopDivider} /> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {it.tips?.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tips</Text>
            {it.tips.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {linkedPlaces.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Places in this route</Text>
            <Text style={styles.subMuted}>Tap to open details and directions.</Text>
            {linkedPlaces.map((p: Place, idx: number) => (
              <TouchableOpacity
                key={`${p.name}-${p.address}-${idx}`}
                style={styles.placeRow}
                activeOpacity={0.85}
                onPress={() =>
                  (navigation as { navigate: (n: string, o: object) => void }).navigate(
                    'AboutEstablishment',
                    { place: p }
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={p.name}
              >
                <JamIcon ionicon="business" size={22} color={TEAL} />
                <View style={styles.placeTextCol}>
                  <Text style={styles.placeName} numberOfLines={2}>
                    {p.name}
                  </Text>
                  {p.address ? (
                    <Text style={styles.placeAddr} numberOfLines={2}>
                      {p.address}
                    </Text>
                  ) : null}
                </View>
                <JamIcon ionicon="chevron-forward" size={20} color={MUTED} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PAD, paddingTop: 12 },
  greenHeader: {
    backgroundColor: HEADER_GREEN,
    paddingHorizontal: H_PAD,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitleCenter: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: WHITE,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: H_PAD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: TITLE,
    marginBottom: 8,
  },
  emptyBody: { fontSize: 15, color: MUTED, textAlign: 'center', marginBottom: 20 },
  primaryBtn: {
    backgroundColor: TEAL,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryBtnText: { color: WHITE, fontFamily: 'Poppins_500Medium', fontSize: 15 },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: WHITE,
    marginBottom: 16,
    shadowColor: '#1F4F59',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  heroImg: { width: '100%', height: HERO_H },
  heroTextBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroTagText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: TITLE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: WHITE,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    fontFamily: 'Poppins_500Medium',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroPillText: { fontSize: 12, color: WHITE, fontFamily: 'Poppins_500Medium' },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.08)',
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: TITLE,
    marginBottom: 10,
  },
  body: { fontSize: 15, lineHeight: 22, color: MUTED },
  highlightList: { marginTop: 14 },
  highlightRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  checkMark: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: HEADER_GREEN,
    marginTop: 2,
  },
  highlightText: { flex: 1, fontSize: 14, color: TITLE, lineHeight: 20 },
  stopBlock: { marginBottom: 4 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  stopNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: HEADER_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumText: { color: WHITE, fontFamily: 'Poppins_700Bold', fontSize: 14 },
  stopName: { flex: 1, fontFamily: 'Poppins_700Bold', fontSize: 16, color: TITLE },
  stopDesc: { fontSize: 14, color: MUTED, lineHeight: 20, marginLeft: 40, marginBottom: 8 },
  legBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginLeft: 40,
    padding: 10,
    borderRadius: 10,
    backgroundColor: PAGE_BG,
  },
  legText: { flex: 1, fontSize: 13, color: TEAL, lineHeight: 18 },
  stopDivider: {
    height: 1,
    backgroundColor: 'rgba(31,79,89,0.1)',
    marginVertical: 16,
    marginLeft: 40,
  },
  estRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 40,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: PAGE_BG,
    borderWidth: 1,
    borderColor: 'rgba(31,79,89,0.1)',
  },
  estThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(31,79,89,0.08)',
  },
  estThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  estTextCol: { flex: 1, minWidth: 0 },
  estLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: HEADER_GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  estName: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: TITLE },
  estAddr: { fontSize: 12, color: MUTED, marginTop: 2 },
  tipRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  bullet: { color: HEADER_GREEN, fontSize: 16, width: 14 },
  tipText: { flex: 1, fontSize: 14, color: TITLE, lineHeight: 20 },
  subMuted: { fontSize: 13, color: MUTED, marginBottom: 12, marginTop: -4 },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(31,79,89,0.12)',
  },
  placeTextCol: { flex: 1 },
  placeName: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: TITLE },
  placeAddr: { fontSize: 13, color: MUTED, marginTop: 2 },
});
