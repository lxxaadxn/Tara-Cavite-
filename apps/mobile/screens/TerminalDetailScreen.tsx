import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';
import { SaveToListSheet, type SaveToListRow } from '../components/SaveToListSheet';
import { ReviewCardsList } from '../components/ReviewCardsList';
import { Terminal } from '../data/mockData';
import { terminalAddressLine } from '../lib/terminalHelpers';
import { supabase } from '../lib/supabase';
import {
  isTerminalSavedByUser,
  removeTerminalFromAllUserLists,
  addTerminalToSavedList,
  fetchUserListsForPicker,
} from '../lib/savedListItems';

/** Match AboutEstablishmentScreen */
const GREEN = '#7EA00E';
const TEAL = '#1F4F59';
const OLIVE = '#213502';
const TITLE = '#241D13';
const MUTED = '#868686';
const WHITE = '#FFFFFF';
const PAGE_BG = '#FAFAF8';
const CARD_BORDER = 'rgba(122, 120, 120, 0.18)';

const PILL_STYLES = {
  green: { bg: 'rgba(126, 160, 14, 0.5)', text: GREEN },
  teal: { bg: 'rgba(31, 79, 89, 0.5)', text: TEAL },
} as const;

type PillVariant = keyof typeof PILL_STYLES;
type DetailTab = 'description' | 'routes' | 'reviews';

function buildTerminalTags(t: Terminal): { label: string; variant: PillVariant }[] {
  const out: { label: string; variant: PillVariant }[] = [];
  out.push({ label: 'Terminal', variant: 'green' });
  out.push({
    label: t.status === 'OPEN' ? 'Open' : t.status === 'CLOSED' ? 'Closed' : t.status,
    variant: 'teal',
  });
  const firstMode = t.transportTypes?.[0];
  if (firstMode) out.push({ label: firstMode, variant: 'green' });
  return out.slice(0, 3);
}

function descriptionFor(t: Terminal): string {
  const hoursBit = `The facility is open ${t.operatingHours}; hours may differ on holidays or during special events.`;
  if (t.description) {
    return `${t.description.trim()}\n\n${hoursBit}`;
  }
  const open = t.status === 'OPEN' ? 'open' : 'closed';
  return [
    `${t.name} is a ${open} transport hub serving ${t.transportTypes.join(', ')} and connecting passengers across the region.`,
    hoursBit,
  ].join('\n\n');
}

const TerminalDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const terminal = (route.params as { terminal?: Terminal })?.terminal;
  const [tab, setTab] = useState<DetailTab>('description');
  const [saved, setSaved] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [pickLists, setPickLists] = useState<SaveToListRow[]>([]);
  const [saveListBusyId, setSaveListBusyId] = useState<string | null>(null);
  const [openGates, setOpenGates] = useState<Record<string, boolean>>({});

  const addressLine = useMemo(
    () => (terminal ? terminalAddressLine(terminal) : ''),
    [terminal]
  );
  const description = useMemo(
    () => (terminal ? descriptionFor(terminal) : ''),
    [terminal]
  );
  const tags = useMemo(() => (terminal ? buildTerminalTags(terminal) : []), [terminal]);

  const onShare = async () => {
    if (!terminal) return;
    try {
      await Share.share({
        message: `${terminal.name}\n${addressLine}`,
        title: terminal.name,
      });
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const gates = terminal?.routesByGate;
    if (gates?.length) {
      setOpenGates({ [gates[0].gateName]: true });
    } else {
      setOpenGates({});
    }
  }, [terminal?.id]);

  const refreshSavedState = useCallback(async () => {
    if (!terminal) return;
    setCheckingSaved(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaved(false);
        return;
      }
      const yes = await isTerminalSavedByUser(supabase, user.id, terminal.id);
      setSaved(yes);
    } catch {
      setSaved(false);
    } finally {
      setCheckingSaved(false);
    }
  }, [terminal]);

  useEffect(() => {
    refreshSavedState();
  }, [refreshSavedState]);

  useFocusEffect(
    useCallback(() => {
      refreshSavedState();
    }, [refreshSavedState])
  );

  const openSaveToListPicker = async () => {
    if (!terminal) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in', 'Sign in to save terminals to your lists.');
      return;
    }
    try {
      const lists = await fetchUserListsForPicker(supabase, user.id);
      if (!lists.length) {
        Alert.alert(
          'No saved lists yet',
          'Create a list first from your profile under Saved list, then come back here.'
        );
        return;
      }
      setPickLists(lists);
      setSaveModalVisible(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load lists.');
    }
  };

  const onConfirmRemoveSave = () => {
    if (!terminal) return;
    Alert.alert('Remove from saved lists?', 'This removes this terminal from every list it’s in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
              setSaved(false);
              return;
            }
            await removeTerminalFromAllUserLists(supabase, user.id, terminal.id);
            setSaved(false);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not update saved lists.');
          }
        },
      },
    ]);
  };

  const onPressSaveFab = () => {
    if (saved) onConfirmRemoveSave();
    else openSaveToListPicker();
  };

  const onPickList = async (list: SaveToListRow) => {
    if (!terminal) return;
    setSaveListBusyId(list.id);
    try {
      const res = await addTerminalToSavedList(supabase, list.id, terminal.id);
      if (res.ok) {
        setSaveModalVisible(false);
        setSaved(true);
        return;
      }
      if (res.duplicate) {
        setSaveModalVisible(false);
        setSaved(true);
        Alert.alert('Already in list', `“${terminal.name}” is already in “${list.name}”.`);
        return;
      }
      Alert.alert('Error', res.message ?? 'Could not save to this list.');
    } finally {
      setSaveListBusyId(null);
    }
  };

  const toggleGate = (gateName: string) => {
    setOpenGates((prev) => ({ ...prev, [gateName]: !prev[gateName] }));
  };

  const openDirections = () => {
    if (!terminal) return;
    (navigation as { navigate: (name: string, params: object) => void }).navigate('Directions', {
      place: {
        id: terminal.id,
        name: terminal.name,
        address: addressLine,
        type: 'Terminal',
        hours: terminal.operatingHours,
        latitude: terminal.latitude,
        longitude: terminal.longitude,
      },
    });
  };

  if (!terminal) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, backgroundColor: PAGE_BG }]}>
        <Text style={styles.missingText}>Terminal not found</Text>
      </View>
    );
  }

  const hasGates = terminal.routesByGate && terminal.routesByGate.length > 0;
  const hasFlatRoutes = terminal.primaryRoutes.length > 0;

  const greenHeader = (
    <View style={[styles.greenHeader, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <JamIcon ionicon="chevron-left" size={26} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} pointerEvents="none">
          {terminal.name}
        </Text>
        <View style={styles.headerIconBtn} />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: PAGE_BG }]}>
      {greenHeader}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.heroWrap}>
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <JamIcon name="building" size={48} color={MUTED} />
          </View>
        </View>

        <Text style={styles.placeName}>{terminal.name}</Text>
        {addressLine ? (
          <Text style={styles.addressLine} numberOfLines={2}>
            {addressLine}
          </Text>
        ) : null}

        <View style={styles.tagsAndActionsRow}>
          <View style={styles.pillRow}>
            {tags.map((t) => {
              const ps = PILL_STYLES[t.variant];
              return (
                <View key={`${t.label}-${t.variant}`} style={[styles.pill, { backgroundColor: ps.bg }]}>
                  <Text style={[styles.pillText, { color: ps.text }]}>{t.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.actionPair}>
            <TouchableOpacity
              style={[styles.fab, styles.fabSave, saved && styles.fabSaveActive]}
              onPress={onPressSaveFab}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove save' : 'Save terminal'}
              activeOpacity={0.82}
              disabled={checkingSaved}
            >
              {checkingSaved ? (
                <ActivityIndicator size="small" color={saved ? WHITE : GREEN} />
              ) : (
                <JamIcon ionicon="bookmark-outline" size={20} color={saved ? WHITE : GREEN} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fab, styles.fabShare]}
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel="Share"
              activeOpacity={0.82}
            >
              <JamIcon ionicon="share-outline" size={20} color={TEAL} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.segmentWrap} accessibilityRole="tablist">
          <Pressable
            onPress={() => setTab('description')}
            style={[styles.segmentSlot, tab === 'description' && styles.segmentSlotActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'description' }}
          >
            <Text
              style={[styles.segmentLabel, tab === 'description' ? styles.segmentLabelOn : styles.segmentLabelOff]}
            >
              Description
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('routes')}
            style={[styles.segmentSlot, tab === 'routes' && styles.segmentSlotActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'routes' }}
          >
            <Text style={[styles.segmentLabel, tab === 'routes' ? styles.segmentLabelOn : styles.segmentLabelOff]}>
              Routes
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('reviews')}
            style={[styles.segmentSlot, tab === 'reviews' && styles.segmentSlotActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'reviews' }}
          >
            <Text style={[styles.segmentLabel, tab === 'reviews' ? styles.segmentLabelOn : styles.segmentLabelOff]}>
              Reviews
            </Text>
          </Pressable>
        </View>

        {tab === 'description' ? (
          <>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionLabel}>About this terminal</Text>
              <Text style={styles.bodyText}>{description}</Text>
            </View>
            <TouchableOpacity
              onPress={openDirections}
              style={styles.directionsButton}
              activeOpacity={0.92}
              accessibilityRole="button"
              accessibilityLabel="Get directions"
            >
              <Text style={styles.directionsButtonLabel}>Get directions</Text>
            </TouchableOpacity>
          </>
        ) : tab === 'routes' ? (
          <View style={styles.routesBlock}>
            {!hasGates && !hasFlatRoutes ? (
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionLabel}>Routes</Text>
                <Text style={styles.bodyText}>No routes listed yet.</Text>
              </View>
            ) : hasGates && terminal.routesByGate ? (
              terminal.routesByGate.map((gate) => {
                const open = !!openGates[gate.gateName];
                return (
                  <View key={gate.gateName} style={styles.routeGateCard}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleGate(gate.gateName)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                    >
                      <Text style={styles.accordionTitle} numberOfLines={2}>
                        {gate.gateName}
                      </Text>
                      <JamIcon ionicon={open ? 'chevron-up' : 'chevron-down'} size={22} color={TEAL} />
                    </TouchableOpacity>
                    {open ? (
                      <View style={styles.accordionBody}>
                        {gate.routes.map((r, idx) => (
                          <View key={`${gate.gateName}-${idx}`} style={styles.routeLineRow}>
                            <View style={styles.routeBullet} />
                            <Text style={styles.routeLineText}>{r.label}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionLabel}>Routes</Text>
                {terminal.primaryRoutes.map((r, i) => (
                  <View
                    key={i}
                    style={[styles.flatRouteRow, i < terminal.primaryRoutes.length - 1 && styles.flatRouteRowBorder]}
                  >
                    <View style={styles.routeAccentBar} />
                    <Text style={styles.flatRouteText}>{r.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <ReviewCardsList />
        )}
      </ScrollView>

      <SaveToListSheet
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        hint={`Choose a list to add “${terminal.name}”.`}
        lists={pickLists}
        onSelectList={onPickList}
        busyListId={saveListBusyId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  greenHeader: {
    backgroundColor: GREEN,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: WHITE,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  heroWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#E8E8E8',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: TITLE,
    marginBottom: 6,
  },
  addressLine: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    marginBottom: 12,
  },
  tagsAndActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  pillRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    minWidth: 0,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  pillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 15,
  },
  actionPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSave: {
    backgroundColor: 'rgba(126, 160, 14, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(126, 160, 14, 0.45)',
  },
  fabSaveActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  fabShare: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: 'rgba(31, 79, 89, 0.28)',
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(126, 160, 14, 0.12)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(126, 160, 14, 0.22)',
  },
  segmentSlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 11,
    minWidth: 0,
  },
  segmentSlotActive: {
    backgroundColor: WHITE,
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  segmentLabelOn: {
    color: GREEN,
    fontFamily: 'Inter_700Bold',
  },
  segmentLabelOff: {
    color: MUTED,
  },
  descriptionCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  descriptionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: TEAL,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: TITLE,
    letterSpacing: 0.15,
  },
  directionsButton: {
    marginTop: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 54,
    borderRadius: 9999,
    backgroundColor: GREEN,
  },
  directionsButtonLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 17,
    lineHeight: 22,
    color: WHITE,
    textAlign: 'center',
  },
  routesBlock: {
    marginBottom: 8,
    gap: 12,
  },
  routeGateCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    shadowColor: OLIVE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  accordionTitle: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: TEAL,
    marginRight: 12,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    backgroundColor: WHITE,
  },
  routeLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  routeBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
    marginTop: 8,
    marginRight: 12,
  },
  routeLineText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: TITLE,
  },
  flatRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  flatRouteRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  routeAccentBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: GREEN,
    marginRight: 14,
  },
  flatRouteText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: TITLE,
  },
  missingText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: MUTED,
    textAlign: 'center',
    padding: 24,
  },
});

export default TerminalDetailScreen;
