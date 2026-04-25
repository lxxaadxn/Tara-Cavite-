import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JamIcon } from './JamIcon';

export type SaveToListRow = { id: string; name: string; type: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  hint: string;
  lists: SaveToListRow[];
  onSelectList: (list: SaveToListRow) => void;
  busyListId: string | null;
};

const GREEN = '#7EA00E';
const TITLE = '#241D13';
const MUTED = '#7A7878';
const TEAL = '#1F4F59';
const WHITE = '#FFFFFF';
const PLACEHOLDER = '#B3AAAA';

export function SaveToListSheet({
  visible,
  onClose,
  title = 'Save to list',
  hint,
  lists,
  onSelectList,
  busyListId,
}: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!visible) setQ('');
  }, [visible]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return lists;
    return lists.filter((l) => l.name.toLowerCase().includes(s));
  }, [lists, q]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 12) + 16,
              maxHeight: '72%',
            },
          ]}
        >
          <View style={styles.grab} accessibilityRole="adjustable" accessibilityLabel="Sheet handle">
            <View style={styles.grabBar} />
          </View>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>

          {lists.length > 3 ? (
            <View style={styles.searchShell}>
              <JamIcon ionicon="search" size={18} color={MUTED} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search lists…"
                placeholderTextColor={PLACEHOLDER}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {q.length > 0 ? (
                <TouchableOpacity onPress={() => setQ('')} hitSlop={8}>
                  <JamIcon ionicon="close-circle" size={20} color={MUTED} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              lists.length === 0 ? (
                <View style={styles.empty}>
                  <JamIcon ionicon="folder-open-outline" size={40} color={MUTED} />
                  <Text style={styles.emptyTitle}>No lists yet</Text>
                  <Text style={styles.emptySub}>Create a list from Profile → Saved lists first.</Text>
                </View>
              ) : (
                <Text style={styles.noMatch}>No match for “{q.trim()}”.</Text>
              )
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onSelectList(item)}
                disabled={busyListId !== null}
                activeOpacity={0.75}
              >
                <View style={styles.rowIcon}>
                  <JamIcon ionicon="bookmark" size={20} color={GREEN} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {item.type === 'private' ? 'Private list' : 'Shared list'}
                  </Text>
                </View>
                {busyListId === item.id ? (
                  <ActivityIndicator size="small" color={GREEN} />
                ) : (
                  <JamIcon ionicon="add-circle-outline" size={24} color={TEAL} />
                )}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelLabel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 20, 0.5)',
    justifyContent: 'flex-end',
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  grab: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  sheetTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: TITLE,
    marginBottom: 6,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    marginBottom: 14,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f4f6ec',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(31, 79, 89, 0.1)',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: TITLE,
    paddingVertical: 2,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(122, 120, 120, 0.2)',
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(126, 160, 14, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: TITLE,
    marginBottom: 2,
  },
  rowMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: TITLE,
    marginTop: 12,
  },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  noMatch: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    paddingVertical: 20,
  },
  cancelBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 14, paddingHorizontal: 24 },
  cancelLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: TEAL,
  },
});
