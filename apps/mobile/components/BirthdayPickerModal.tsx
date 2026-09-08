import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/theme';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const TEAL = '#1B8A70';
const ROW_TEXT = '#241D13';
const BORDER = 'rgba(122, 120, 120, 0.45)';

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

type Props = {
  visible: boolean;
  initialDate: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  bottomInset: number;
};

export function BirthdayPickerModal({
  visible,
  initialDate,
  onClose,
  onConfirm,
  bottomInset,
}: Props) {
  const [month, setMonth] = useState(initialDate.getMonth());
  const [day, setDay] = useState(initialDate.getDate());
  const [year, setYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (visible) {
      const d = initialDate;
      setMonth(d.getMonth());
      setDay(d.getDate());
      setYear(d.getFullYear());
    }
  }, [visible, initialDate]);

  const maxDay = daysInMonth(year, month);
  const effectiveDay = Math.min(day, maxDay);

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    const start = 1925;
    const list: number[] = [];
    for (let y = cur; y >= start; y--) list.push(y);
    return list;
  }, []);

  const days = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => i + 1),
    [maxDay]
  );

  const handleConfirm = () => {
    onConfirm(new Date(year, month, effectiveDay));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 16) + 12 }]}>
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.toolbarBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.toolbarTitle}>Birthday</Text>
            <TouchableOpacity onPress={handleConfirm} hitSlop={12}>
              <Text style={[styles.toolbarBtn, styles.done]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.columns}>
            <ScrollView
              style={styles.col}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {MONTHS.map((label, m) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.cell, month === m && styles.cellActive]}
                  onPress={() => setMonth(m)}
                >
                  <Text
                    style={[styles.cellText, month === m && styles.cellTextActive]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView
              style={styles.colNarrow}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {days.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.cell, effectiveDay === d && styles.cellActive]}
                  onPress={() => setDay(d)}
                >
                  <Text
                    style={[styles.cellText, effectiveDay === d && styles.cellTextActive]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView
              style={styles.col}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {years.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.cell, year === y && styles.cellActive]}
                  onPress={() => setYear(y)}
                >
                  <Text
                    style={[styles.cellText, year === y && styles.cellTextActive]}
                  >
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '72%',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  toolbarTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: TEAL,
  },
  toolbarBtn: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: TEAL,
    minWidth: 64,
  },
  done: {
    fontFamily: 'Inter_700Bold',
    color: Colors.accent,
    textAlign: 'right',
  },
  columns: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 4,
  },
  col: {
    flex: 1,
    maxHeight: 260,
  },
  colNarrow: {
    width: 56,
    maxHeight: 260,
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 2,
  },
  cellActive: {
    backgroundColor: 'rgba(16, 163, 127, 0.2)',
  },
  cellText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: ROW_TEXT,
    textAlign: 'center',
  },
  cellTextActive: {
    color: TEAL,
    fontFamily: 'Poppins_600SemiBold',
  },
});
