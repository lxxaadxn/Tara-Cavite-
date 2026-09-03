import React from 'react';
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
import { pluralCountLabel, SAVE_TO_LIST_CREATE_BUSY_ID } from '../lib/saveToListModalHelpers';

export type SaveToListRow = {
  id: string;
  name: string;
  type: string;
  itemCount?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  itemLabel?: string;
  lists: SaveToListRow[];
  listNameDraft: string;
  onListNameChange: (value: string) => void;
  onSelectList: (list: SaveToListRow) => void;
  onCreateList: () => void;
  busyListId: string | null;
  countLabel?: string;
};

const GREEN = '#10A37F';
const TITLE = '#241D13';
const MUTED = '#6B7280';
const WHITE = '#FFFFFF';
const BORDER = 'rgba(17, 24, 39, 0.1)';
const PLACEHOLDER = '#9CA3AF';

export function SaveToListSheet({
  visible,
  onClose,
  title = 'Save to list',
  subtitle = 'Choose a list or create a new one.',
  itemLabel,
  lists,
  listNameDraft,
  onListNameChange,
  onSelectList,
  onCreateList,
  busyListId,
  countLabel = 'places',
}: Props) {
  const insets = useSafeAreaInsets();
  const hasLists = lists.length > 0;
  const createBlocked = !String(listNameDraft ?? '').trim();
  const createBusy = busyListId === SAVE_TO_LIST_CREATE_BUSY_ID;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8, maxHeight: '85%' },
          ]}
        >
          <View style={styles.grab} accessibilityLabel="Sheet handle">
            <View style={styles.grabBar} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              {itemLabel ? (
                <Text style={styles.itemLabel} numberOfLines={2}>
                  {itemLabel}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <JamIcon ionicon="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {hasLists ? (
              <FlatList
                data={lists}
                keyExtractor={(item) => item.id}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const count = item.itemCount ?? 0;
                  const busy = busyListId === item.id;
                  return (
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => onSelectList(item)}
                      disabled={busyListId !== null}
                      activeOpacity={0.75}
                    >
                      <View style={styles.rowIcon}>
                        <JamIcon ionicon="bookmark" size={18} color={GREEN} />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {count} {pluralCountLabel(count, countLabel)}
                        </Text>
                      </View>
                      {busy ? (
                        <ActivityIndicator size="small" color={GREEN} />
                      ) : (
                        <JamIcon ionicon="chevron-forward" size={20} color={MUTED} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <Text style={styles.emptyHint}>No lists yet — create one below.</Text>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Or create a list</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              value={listNameDraft}
              onChangeText={onListNameChange}
              placeholder="List name"
              placeholderTextColor={PLACEHOLDER}
              style={styles.nameInput}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!createBlocked && !busyListId) onCreateList();
              }}
              editable={!createBusy && busyListId === null}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.createBtn, createBlocked && styles.createBtnDisabled]}
              onPress={onCreateList}
              disabled={createBlocked || busyListId !== null}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Create list"
            >
              {createBusy ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <Text style={styles.createBtnLabel}>Create list</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} accessibilityRole="button">
              <Text style={styles.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 20, 0.35)',
    justifyContent: 'flex-end',
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  grab: { alignItems: 'center', paddingVertical: 8 },
  grabBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerText: { flex: 1, minWidth: 0 },
  sheetTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: TITLE,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  itemLabel: {
    marginTop: 4,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: TITLE,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  body: {
    flexShrink: 1,
  },
  list: {
    maxHeight: 200,
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4F3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: TITLE,
    marginBottom: 2,
  },
  rowMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  emptyHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: MUTED,
    paddingVertical: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
  dividerLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
    backgroundColor: WHITE,
    paddingHorizontal: 4,
  },
  nameInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: TITLE,
    backgroundColor: '#FAFAFA',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  createBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  createBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  createBtnLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: WHITE,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: MUTED,
  },
});
