import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JamIcon } from './JamIcon';
import { FilterCategoryIcon } from './FilterCategoryIcon';
import {
  WEB_CATEGORY_OPTIONS,
  WEB_CITY_OPTIONS,
  WEB_MUNICIPALITY_OPTIONS,
} from '../lib/dashboardFilterOptions';
import type { AppliedPlaceFilters } from '../lib/dashboardPlaceFilters';
import { placePassesAppliedFilters } from '../lib/dashboardPlaceFilters';
import type { Place } from '../data/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORY_COLS = 4;
const CATEGORY_GAP = 10;
const SHEET_H_PAD = 20;
const CATEGORY_CARD_WIDTH =
  (SCREEN_WIDTH - SHEET_H_PAD * 2 - CATEGORY_GAP * (CATEGORY_COLS - 1)) / CATEGORY_COLS;

const OLIVE = '#7EA00E';
const OLIVE_DARK = '#5a7a0a';
const TITLE = '#171717';
const MUTED = '#737373';

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

function LocationPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.locationPill, selected && styles.locationPillSelected]}
    >
      <Text style={[styles.locationPillText, selected && styles.locationPillTextSelected]}>{label}</Text>
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
      ? `Show ${previewCount} ${previewCount === 1 ? noun : nounPlural}`
      : activeSelectionCount > 0
        ? 'Apply filters'
        : `Show all ${nounPlural}`;

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
            <View style={styles.headerText}>
              <Text style={styles.title}>Filters</Text>
              <Text style={styles.subtitle}>
                {activeSelectionCount > 0 ? `${activeSelectionCount} selected` : 'Refine your search'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {activeSelectionCount > 0 ? (
                <TouchableOpacity onPress={clearAll} style={styles.resetBtn} accessibilityRole="button">
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <JamIcon ionicon="close-outline" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {hideCategories ? null : (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>CATEGORY</Text>
                <View style={styles.categoryGrid}>
                  {WEB_CATEGORY_OPTIONS.map((opt) => {
                    const selected = categories.has(opt.key);
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => toggleSet(setCategories, opt.key)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                      >
                        <FilterCategoryIcon name={opt.icon} selected={selected} />
                        <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
                          {opt.shortLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={[styles.section, hideCategories ? undefined : styles.sectionSpaced]}>
              <Text style={styles.locationGroupLabel}>Cities</Text>
              <View style={styles.pillRow}>
                {WEB_CITY_OPTIONS.map((opt) => (
                  <LocationPill
                    key={opt.key}
                    label={opt.label}
                    selected={cities.has(opt.key)}
                    onPress={() => toggleSet(setCities, opt.key)}
                  />
                ))}
              </View>

              <Text style={[styles.locationGroupLabel, styles.municipalitiesLabel]}>Municipalities</Text>
              <View style={styles.pillRow}>
                {WEB_MUNICIPALITY_OPTIONS.map((opt) => (
                  <LocationPill
                    key={opt.key}
                    label={opt.label}
                    selected={municipalities.has(opt.key)}
                    onPress={() => toggleSet(setMunicipalities, opt.key)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              accessibilityRole="button"
              accessibilityLabel={applyLabel}
            >
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
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: TITLE,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: OLIVE,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  section: {},
  sectionSpaced: {
    marginTop: 24,
  },
  sectionLabel: {
    marginBottom: 12,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#a3a3a3',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: CATEGORY_CARD_WIDTH,
    minHeight: 92,
    borderRadius: 16,
    backgroundColor: '#f0f0ee',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 14,
  },
  categoryCardSelected: {
    backgroundColor: '#eef4df',
    borderWidth: 2,
    borderColor: 'rgba(126, 160, 14, 0.5)',
  },
  categoryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textAlign: 'center',
    color: '#404040',
  },
  categoryLabelSelected: {
    color: OLIVE_DARK,
  },
  locationGroupLabel: {
    marginBottom: 8,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: MUTED,
  },
  municipalitiesLabel: {
    marginTop: 16,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  locationPillSelected: {
    backgroundColor: OLIVE,
  },
  locationPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#404040',
  },
  locationPillTextSelected: {
    color: '#fff',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  applyBtn: {
    borderRadius: 16,
    backgroundColor: OLIVE,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});
