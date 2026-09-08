import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { JamIcon } from './JamIcon';
export { FILTER_OPTION_LABEL_BY_KEY } from '../lib/dashboardFilterOptions';

const CHEVRON = '#213502';
const BORDER = 'rgba(122, 120, 120, 0.5)';
const TRACK_OFF_BORDER = '#636366';
const ACCENT = '#10A37F';

type FilterOption = { key: string; label: string };

type FilterSection = { id: string; title: string; options: FilterOption[] };

const SECTIONS: FilterSection[] = [
  {
    id: 'sort',
    title: 'Sort by',
    options: [
      { key: 'sort-top', label: 'Top Rated' },
      { key: 'sort-reviewed', label: 'Most Reviewed' },
      { key: 'sort-recent', label: 'Recently Added' },
    ],
  },
  {
    id: 'categories',
    title: 'Categories',
    options: [
      { key: 'cat-nature', label: 'Nature Tourism' },
      { key: 'cat-mice', label: 'MICE & Events' },
      { key: 'cat-restaurant', label: 'Restaurant' },
      { key: 'cat-health', label: 'Health, Wellness & Retirement' },
      { key: 'cat-cultural', label: 'Cultural' },
      { key: 'cat-education', label: 'Education' },
      { key: 'cat-leisure', label: 'Leisure & Entertainment' },
      { key: 'cat-shopping', label: 'Shopping' },
    ],
  },
  {
    id: 'cities',
    title: 'Cities',
    options: [
      { key: 'city-bacoor', label: 'Bacoor City' },
      { key: 'city-carmona', label: 'Carmona City' },
      { key: 'city-cavite', label: 'Cavite City' },
      { key: 'city-dasma', label: 'Dasmariñas City' },
      { key: 'city-gma', label: 'General Mariano Alvarez' },
      { key: 'city-trias', label: 'General Trias City' },
      { key: 'city-imus', label: 'Imus City' },
      { key: 'city-tagaytay', label: 'Tagaytay City' },
      { key: 'city-trece', label: 'Trece Martires City' },
    ],
  },
  {
    id: 'municipalities',
    title: 'Municipalities',
    options: [
      { key: 'mun-amadeo', label: 'Amadeo' },
      { key: 'mun-alfonso', label: 'Alfonso' },
      { key: 'mun-indang', label: 'Indang' },
      { key: 'mun-magallanes', label: 'Magallanes' },
      { key: 'mun-mendez', label: 'Mendez-Nuñez' },
      { key: 'mun-noveleta', label: 'Noveleta' },
      { key: 'mun-silang', label: 'Silang' },
      { key: 'mun-tanza', label: 'Tanza' },
    ],
  },
  {
    id: 'access',
    title: 'Accessibility and Transport',
    options: [
      { key: 'acc-commute', label: 'Commute Accessible' },
      { key: 'acc-parking', label: 'Parking Available' },
      { key: 'acc-road', label: 'Easy Access Road' },
    ],
  },
  {
    id: 'amenities',
    title: 'Features and Amenities',
    options: [
      { key: 'am-wifi', label: 'Wifi Available' },
      { key: 'am-pet', label: 'Pet-Friendly' },
      { key: 'am-food', label: 'Food Available' },
      { key: 'am-insta', label: 'Instagrammable' },
    ],
  },
];

/** Ids for `sectionIds` on {@link DashboardFiltersPanel}. */
export type DashboardFilterSectionId =
  | 'sort'
  | 'categories'
  | 'cities'
  | 'municipalities'
  | 'access'
  | 'amenities';

function getVisibleSections(sectionIds?: DashboardFilterSectionId[]): FilterSection[] {
  if (!sectionIds?.length) return SECTIONS;
  const allow = new Set(sectionIds);
  return SECTIONS.filter((s) => allow.has(s.id as DashboardFilterSectionId));
}

function buildTogglesFor(sections: FilterSection[]): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const s of sections) {
    for (const o of s.options) {
      m[o.key] = false;
    }
  }
  return m;
}

function buildCollapsedFor(sections: FilterSection[]): Record<string, boolean> {
  const e: Record<string, boolean> = {};
  for (const s of sections) e[s.id] = false;
  return e;
}

function FilterSwitchVisual({ value }: { value: boolean }) {
  return (
    <View
      style={[
        styles.switchTrack,
        value && styles.switchTrackOn,
        value ? styles.switchJustifyEnd : styles.switchJustifyStart,
      ]}
      pointerEvents="none"
    >
      <View style={[styles.switchThumb, value && styles.switchThumbOn]} />
    </View>
  );
}

type DashboardFiltersPanelProps = {
  /** When true, tighter margins when used inside a modal/sheet. */
  embedded?: boolean;
  /** Bottom sheet: flush width, no card shadow, flat merge with sheet container. */
  sheet?: boolean;
  /** Max height of the scroll area in sheet mode. */
  sheetScrollMaxHeight?: number;
  /**
   * If set, only these sections are shown (order matches master list).
   * Omit or empty → all sections (dashboard default).
   */
  sectionIds?: DashboardFilterSectionId[];
  /** Fired whenever toggle map changes (e.g. parent applies filters). */
  onTogglesChange?: (toggles: Record<string, boolean>) => void;
};

export function DashboardFiltersPanel({
  embedded,
  sheet,
  sheetScrollMaxHeight,
  sectionIds,
  onTogglesChange,
}: DashboardFiltersPanelProps) {
  const sectionIdsKey =
    sectionIds == null || sectionIds.length === 0
      ? ''
      : [...sectionIds].sort().join('|');
  const visibleSections = useMemo(() => {
    if (!sectionIdsKey) return getVisibleSections(undefined);
    return getVisibleSections(sectionIdsKey.split('|') as DashboardFilterSectionId[]);
  }, [sectionIdsKey]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    buildCollapsedFor(getVisibleSections(sectionIds))
  );
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    buildTogglesFor(getVisibleSections(sectionIds))
  );

  const onTogglesChangeRef = useRef(onTogglesChange);
  onTogglesChangeRef.current = onTogglesChange;

  useEffect(() => {
    setToggles(buildTogglesFor(visibleSections));
    setExpanded(buildCollapsedFor(visibleSections));
  }, [visibleSections]);

  useEffect(() => {
    onTogglesChangeRef.current?.(toggles);
  }, [toggles]);

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const flip = useCallback((key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const reset = useCallback(() => {
    setToggles(buildTogglesFor(visibleSections));
    setExpanded(buildCollapsedFor(visibleSections));
  }, [visibleSections]);

  const scrollMaxH =
    sheetScrollMaxHeight != null && sheetScrollMaxHeight > 0
      ? sheetScrollMaxHeight
      : Math.round(Dimensions.get('window').height * 0.5) - 24;

  const renderSection = (section: FilterSection) => (
    <View>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(section.id)}
        accessibilityRole="button"
        accessibilityLabel={`${section.title}, ${expanded[section.id] ? 'expanded' : 'collapsed'}`}
      >
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <JamIcon
          name={expanded[section.id] ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={CHEVRON}
        />
      </TouchableOpacity>
      {expanded[section.id] ? (
        <View style={styles.sectionBody}>
          {section.options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.optionRow}
              onPress={() => flip(opt.key)}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityState={{ checked: !!toggles[opt.key] }}
              accessibilityLabel={opt.label}
            >
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <FilterSwitchVisual value={!!toggles[opt.key]} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );

  const headerBlock = (
    <>
      <View style={styles.cardHeader}>
        <Text style={styles.titleFilters}>Filters</Text>
        <TouchableOpacity onPress={reset} accessibilityRole="button" accessibilityLabel="Reset filters">
          <Text style={styles.titleReset}>Reset</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.rule} />
    </>
  );

  if (sheet) {
    return (
      <View style={[styles.card, embedded && styles.cardEmbedded, styles.cardSheet]}>
        {headerBlock}
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: scrollMaxH }}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator
        >
          {visibleSections.map((section, idx) => (
            <View key={section.id}>
              {renderSection(section)}
              {idx < visibleSections.length - 1 ? <View style={styles.rule} /> : null}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      {headerBlock}
      {visibleSections.map((section, idx) => (
        <View key={section.id}>
          {renderSection(section)}
          {idx < visibleSections.length - 1 ? <View style={styles.rule} /> : null}
        </View>
      ))}
    </View>
  );
}

const THUMB = 16;
const TRACK_W = 40;
const TRACK_H = 22;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
  },
  cardEmbedded: {
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  cardSheet: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleFilters: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    lineHeight: 22,
    color: '#000000',
  },
  titleReset: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    lineHeight: 18,
    color: '#000000',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: '#000000',
    flex: 1,
    paddingRight: 8,
  },
  sectionBody: {
    paddingBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 10,
  },
  optionLabel: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 20,
    color: '#000000',
  },
  switchTrack: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    borderWidth: 2,
    borderColor: TRACK_OFF_BORDER,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  switchJustifyStart: {
    justifyContent: 'flex-start',
  },
  switchJustifyEnd: {
    justifyContent: 'flex-end',
  },
  switchTrackOn: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(16, 163, 127, 0.15)',
  },
  switchThumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: TRACK_OFF_BORDER,
  },
  switchThumbOn: {
    backgroundColor: ACCENT,
  },
  sheetScrollContent: {
    flexGrow: 0,
    paddingBottom: 8,
  },
});
