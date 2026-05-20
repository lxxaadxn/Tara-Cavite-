import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { publishedItineraries } from '../data/publishedItineraries';
import { formatRouteLine, metaLine } from '../lib/itineraryFormat';
import { placeImageSource } from '../lib/placeImageSource';

const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const TITLE = '#241D13';
const MUTED = '#7A7878';
const PAGE_BG = '#F4F6EC';
const WHITE = '#FFFFFF';
const H_PAD = 16;
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_IMG_H = Math.round(SCREEN_W * 0.56);

const ItinerariesScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as { navigate: (n: string) => void }).navigate('Dashboard');
    }
  };

  const openDetail = (itineraryId: string) => {
    (navigation as { navigate: (n: string, p: object) => void }).navigate('ItineraryDetail', {
      itineraryId,
    });
  };

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
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} pointerEvents="none">
              Curated routes
            </Text>
          </View>
          <View style={styles.headerSide} />
        </View>
      </View>

      <FlatList
        data={publishedItineraries}
        keyExtractor={(it) => it.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 88 + Math.max(insets.bottom, 12) },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.intro}>
            Ready-made trips from our team. Save any route and follow it stop by stop.
          </Text>
        }
        renderItem={({ item: it }) => {
          const img = placeImageSource(it.image);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => openDetail(it.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open itinerary ${it.title}`}
            >
              {img ? (
                <Image source={img} style={styles.cardImage} resizeMode="cover" accessibilityLabel="" />
              ) : (
                <View style={styles.cardImage} />
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {it.title}
                </Text>
                <Text style={styles.cardRoute} numberOfLines={2}>
                  {formatRouteLine(it)}
                </Text>
                {it.summary ? (
                  <Text style={styles.cardSummary} numberOfLines={2}>
                    {it.summary}
                  </Text>
                ) : (
                  <View style={styles.cardSummarySpacer} />
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardMeta}>{metaLine(it)}</Text>
                  <View style={styles.cardChevron} accessibilityElementsHidden>
                    <JamIcon ionicon="chevron-forward" size={14} color={MUTED} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  greenHeader: {
    backgroundColor: HEADER_GREEN,
    paddingHorizontal: H_PAD,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    lineHeight: 24,
    color: WHITE,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    gap: 16,
  },
  intro: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    marginBottom: 4,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.1)',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: CARD_IMG_H,
    backgroundColor: '#E8E8E8',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    minHeight: 120,
  },
  cardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: TITLE,
  },
  cardRoute: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#525252',
    marginTop: 6,
  },
  cardSummary: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
    marginTop: 8,
    flex: 1,
  },
  cardSummarySpacer: {
    flex: 1,
    minHeight: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(31, 79, 89, 0.08)',
  },
  cardMeta: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: MUTED,
  },
  cardChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ItinerariesScreen;
