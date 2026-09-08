import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JamIcon } from './JamIcon';
import { FilterCategoryIcon } from './FilterCategoryIcon';
import { WEB_CITY_OPTIONS, WEB_MUNICIPALITY_OPTIONS } from '../lib/dashboardFilterOptions';
import type { AppliedPlaceFilters } from '../lib/dashboardPlaceFilters';
import {
  getDefaultCategoryKeywords,
  placePassesAppliedFilters,
  setRuntimeCategoryKeywords,
  setRuntimeCategoryLabels,
  setRuntimeLocationLabels,
} from '../lib/dashboardPlaceFilters';
import {
  fetchAppFilterCategoryOptions,
  keywordMapFromOptions,
  labelMapFromOptions,
  staticCategoryOptions,
  type AppFilterCategoryOption,
} from '../lib/appFilterCategories';
import { fetchLguFilterOptions, locationLabelMapFromOptions, type LguFilterOption } from '../lib/lguFilterOptions';
import { paletteForFilterCategory, paletteForLguKind } from 'cavitour-shared/ntdpFilterMeta';
import type { Place } from '../data/mockData';

const PILL_GAP = 8;
const SHEET_H_PAD = 20;

const OLIVE = '#10A37F';
const TITLE = '#16352E';
const MUTED = '#9CA3AF';
const BORDER = '#E5E7EB';
const TINT = '#E4F3EE';

function setsFromFilters(f: AppliedPlaceFilters | null) {
  return {
    categories: new Set(f?.selectedCategoryKeys ?? []),
    cities: new Set(f?.selectedCityKeys ?? []),
    municipalities: new Set(f?.selectedMunicipalityKeys ?? []),
  };
}

function pendingFilters(
  categories: Set<string>,
  cities: Set<string>,
  municipalities: Set<string>
): AppliedPlaceFilters {
  return {
    selectedCategoryKeys: Array.from(categories),
    selectedCityKeys: Array.from(cities),
    selectedMunicipalityKeys: Array.from(municipalities),
  };
}

function selectionCount(categories: Set<string>, cities: Set<string>, municipalities: Set<string>) {
  return categories.size + cities.size + municipalities.size;
}

function FilterPill({
  label,
  selected,
  onPress,
  icon,
  palette,
  stacked,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  palette?: { color: string; tint: string; selectedText: string };
  stacked?: boolean;
}) {
  const color = palette?.color || OLIVE;
  const tint = palette?.tint || TINT;
  const selectedText = palette?.selectedText || TITLE;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.pill,
        stacked ? styles.pillStacked : styles.pillGridItem,
        palette && !selected ? { borderColor: `${color}66` } : null,
        selected ? { backgroundColor: tint, borderColor: color } : null,
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.pillIconWrap,
            { backgroundColor: selected ? 'rgba(255,255,255,0.85)' : `${color}22` },
          ]}
        >
          {icon}
        </View>
      ) : (
        <View style={[styles.pillDot, { backgroundColor: color }]} />
      )}
      <Text
        style={[styles.pillText, selected && { color: selectedText }]}
        numberOfLines={stacked ? 2 : 1}
      >
        {label}
      </Text>
      {selected ? (
        <JamIcon ionicon="checkmark" size={16} color={color} />
      ) : (
        <View style={styles.pillCheckSpacer} />
      )}
    </TouchableOpacity>
  );
}

type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  appliedFilters?: AppliedPlaceFilters | null;
  onApply?: (filters: AppliedPlaceFilters) => void;
  places?: Place[];
  hideCategories?: boolean;
  resultNoun?: string;
};

export function FilterModal({
  visible,
  onClose,
  appliedFilters = null,
  onApply,
  places = [],
  hideCategories = false,
  resultNoun = 'place',
}: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState(() => new Set<string>());
  const [cities, setCities] = useState(() => new Set<string>());
  const [municipalities, setMunicipalities] = useState(() => new Set<string>());
  const [categoryOptions, setCategoryOptions] = useState<AppFilterCategoryOption[]>(() =>
    staticCategoryOptions()
  );
  const [cityOptions, setCityOptions] = useState<LguFilterOption[]>(() =>
    WEB_CITY_OPTIONS.map((o) => ({ key: o.label, label: o.label }))
  );
  const [municipalityOptions, setMunicipalityOptions] = useState<LguFilterOption[]>(() =>
    WEB_MUNICIPALITY_OPTIONS.map((o) => ({ key: o.label, label: o.label }))
  );

  useEffect(() => {
    let cancelled = false;
    void fetchAppFilterCategoryOptions().then((opts) => {
      if (cancelled) return;
      setCategoryOptions(opts);
      setRuntimeCategoryKeywords(keywordMapFromOptions(opts, getDefaultCategoryKeywords()));
      setRuntimeCategoryLabels(labelMapFromOptions(opts));
    });
    void fetchLguFilterOptions().then(({ cities: cityOpts, municipalities: munOpts }) => {
      if (cancelled) return;
      setCityOptions(cityOpts);
      setMunicipalityOptions(munOpts);
      setRuntimeLocationLabels(locationLabelMapFromOptions(cityOpts, munOpts));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const s = setsFromFilters(appliedFilters);
    setCategories(s.categories);
    setCities(s.cities);
    setMunicipalities(s.municipalities);
  }, [visible, appliedFilters]);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const clearAll = () => {
    setCategories(new Set());
    setCities(new Set());
    setMunicipalities(new Set());
  };

  const pending = useMemo(
    () => pendingFilters(categories, cities, municipalities),
    [categories, cities, municipalities]
  );

  const previewCount = useMemo(() => {
    if (!places.length) return null;
    return places.filter((p) => placePassesAppliedFilters(p, pending)).length;
  }, [places, pending]);

  const activeSelectionCount = hideCategories
    ? cities.size + municipalities.size
    : selectionCount(categories, cities, municipalities);

  const noun = resultNoun;
  const nounPlural = `${noun}${noun.endsWith('s') ? '' : 's'}`;
  const applyLabel =
    previewCount != null
      ? `Find ${previewCount} results`
      : activeSelectionCount > 0
        ? 'Find results'
        : `Find all ${nounPlural}`;

  const handleApply = () => {
    onApply?.(pending);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close filters" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} accessibilityElementsHidden />

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <JamIcon ionicon="filter" size={18} color={OLIVE} />
              <Text style={styles.title}>Filter</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <JamIcon ionicon="chevron-up" size={18} color={MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {hideCategories ? null : (
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <View style={[styles.sectionDot, { backgroundColor: OLIVE }]} />
                  <Text style={[styles.sectionLabel, { color: OLIVE }]}>Category</Text>
                </View>
                <View style={styles.pillGrid}>
                  {categoryOptions.map((opt) => {
                    const selected = categories.has(opt.key);
                    const palette = paletteForFilterCategory(opt);
                    return (
                      <FilterPill
                        key={opt.key}
                        label={opt.shortLabel || opt.label}
                        selected={selected}
                        palette={palette}
                        onPress={() => toggleSet(setCategories, opt.key)}
                        icon={
                          <FilterCategoryIcon
                            name={opt.icon}
                            selected={selected}
                            size={20}
                            color={palette.color}
                          />
                        }
                      />
                    );
                  })}
                </View>
              </View>
            )}

            <View style={[styles.section, hideCategories ? undefined : styles.sectionSpaced]}>
              <View style={styles.lguColumns}>
                <View style={styles.lguCol}>
                  <View style={styles.sectionLabelRow}>
                    <View style={[styles.sectionDot, { backgroundColor: paletteForLguKind('city').color }]} />
                    <Text style={[styles.sectionLabel, { color: paletteForLguKind('city').color }]}>Cities</Text>
                  </View>
                  <View style={styles.stackedPills}>
                    {cityOptions.map((opt) => (
                      <FilterPill
                        key={opt.key}
                        stacked
                        label={opt.label}
                        selected={cities.has(opt.key)}
                        palette={paletteForLguKind('city')}
                        onPress={() => toggleSet(setCities, opt.key)}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.lguCol}>
                  <View style={styles.sectionLabelRow}>
                    <View style={[styles.sectionDot, { backgroundColor: paletteForLguKind('municipality').color }]} />
                    <Text
                      style={[styles.sectionLabel, { color: paletteForLguKind('municipality').color }]}
                      numberOfLines={1}
                    >
                      Municipalities
                    </Text>
                  </View>
                  <View style={styles.stackedPills}>
                    {municipalityOptions.map((opt) => (
                      <FilterPill
                        key={opt.key}
                        stacked
                        label={opt.label}
                        selected={municipalities.has(opt.key)}
                        palette={paletteForLguKind('municipality')}
                        onPress={() => toggleSet(setMunicipalities, opt.key)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={clearAll} style={styles.resetBtn} accessibilityRole="button">
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              accessibilityRole="button"
              accessibilityLabel={applyLabel}
            >
              <JamIcon ionicon="search-outline" size={16} color="#fff" />
              <Text style={styles.applyBtnText}>{applyLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(38, 38, 38, 0.35)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e5e5',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SHEET_H_PAD,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: TITLE,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: 480,
  },
  scrollContent: {
    paddingHorizontal: SHEET_H_PAD,
    paddingVertical: 16,
  },
  section: {},
  sectionSpaced: {
    marginTop: 20,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: MUTED,
  },
  municipalitiesLabel: {
    marginTop: 20,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PILL_GAP,
  },
  lguColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  lguCol: {
    flex: 1,
    minWidth: 0,
  },
  stackedPills: {
    gap: 8,
  },
  pill: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  pillGridItem: {
    width: '47%',
    flexGrow: 1,
    maxWidth: '48.5%',
  },
  pillStacked: {
    alignSelf: 'stretch',
  },
  pillSelected: {
    backgroundColor: TINT,
    borderColor: OLIVE,
  },
  pillIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  pillText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#4B5563',
  },
  pillTextSelected: {
    color: TITLE,
  },
  pillCheckSpacer: {
    width: 16,
    height: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    paddingHorizontal: SHEET_H_PAD,
    paddingTop: 16,
  },
  resetBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resetBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6B7280',
  },
  applyBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: OLIVE,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});
