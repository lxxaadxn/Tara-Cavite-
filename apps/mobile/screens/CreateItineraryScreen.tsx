import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../components/Header';
import { JamIcon } from '../components/JamIcon';

const TEAL = '#1B8A70';
const PAGE_BG = '#F4F6EC';
const WHITE = '#FFFFFF';
const TITLE = '#241D13';
const MUTED = '#7A7878';
const PLACEHOLDER = '#B3AAAA';
const BORDER = 'rgba(27, 138, 112, 0.12)';
const H_PAD = 16;

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function IconFieldRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      {icon}
      <View style={styles.fieldInner}>{children}</View>
    </View>
  );
}

const CreateItineraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [searchDestinations, setSearchDestinations] = useState('');
  const [destinations, setDestinations] = useState<string[]>(['', '']);

  const updateDestination = (index: number, value: string) => {
    setDestinations((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addDestinationRow = () => setDestinations((prev) => [...prev, '']);

  const removeDestination = (index: number) => {
    setDestinations((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const onStartChange = (_event: unknown, date?: Date) => {
    if (Platform.OS === 'android') setShowStart(false);
    if (date) {
      setStartDate(date);
      if (date > endDate) setEndDate(date);
    }
  };

  const onEndChange = (_event: unknown, date?: Date) => {
    if (Platform.OS === 'android') setShowEnd(false);
    if (date) {
      if (date < startDate) {
        Alert.alert('End date', 'End date can’t be before the start date.');
        return;
      }
      setEndDate(date);
    }
  };

  const publish = () => {
    if (!title.trim()) {
      Alert.alert('Itinerary title', 'Please enter a title.');
      return;
    }
    Alert.alert('Published', 'Your itinerary draft is saved locally for now.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const iosStartPicker = showStart && Platform.OS === 'ios';
  const iosEndPicker = showEnd && Platform.OS === 'ios';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Header title="Create itinerary" showBack darkBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 32 + Math.max(insets.bottom, 12) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Basics</Text>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Tagaytay ridge & cafés"
              placeholderTextColor={PLACEHOLDER}
              value={title}
              onChangeText={setTitle}
              accessibilityLabel="Itinerary title"
            />
            <Text style={styles.helper}>Include area and vibe so it’s easy to find later.</Text>

            <Text style={[styles.label, styles.labelSpaced]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What’s the story of this trip?"
              placeholderTextColor={PLACEHOLDER}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              accessibilityLabel="General description"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>When</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.label}>Start</Text>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => {
                    setShowEnd(false);
                    setShowStart(true);
                  }}
                  accessibilityLabel="Choose start date"
                >
                  <JamIcon name="calendar" size={18} color={TEAL} />
                  <Text style={styles.dateBtnText}>{formatDate(startDate)}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.label}>End</Text>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => {
                    setShowStart(false);
                    setShowEnd(true);
                  }}
                  accessibilityLabel="Choose end date"
                >
                  <JamIcon name="calendar" size={18} color={TEAL} />
                  <Text style={styles.dateBtnText}>{formatDate(endDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {Platform.OS === 'android' && showStart ? (
            <DateTimePicker value={startDate} mode="date" display="default" onChange={onStartChange} />
          ) : null}
          {Platform.OS === 'android' && showEnd ? (
            <DateTimePicker value={endDate} mode="date" display="default" onChange={onEndChange} />
          ) : null}

          <Modal visible={iosStartPicker} transparent animationType="slide" onRequestClose={() => setShowStart(false)}>
            <View style={styles.iosModalRoot}>
              <Pressable style={styles.iosBackdrop} onPress={() => setShowStart(false)} />
              <View style={[styles.iosSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <DateTimePicker value={startDate} mode="date" display="spinner" onChange={onStartChange} />
                <TouchableOpacity style={styles.iosDone} onPress={() => setShowStart(false)}>
                  <Text style={styles.iosDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={iosEndPicker} transparent animationType="slide" onRequestClose={() => setShowEnd(false)}>
            <View style={styles.iosModalRoot}>
              <Pressable style={styles.iosBackdrop} onPress={() => setShowEnd(false)} />
              <View style={[styles.iosSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <DateTimePicker value={endDate} mode="date" display="spinner" onChange={onEndChange} />
                <TouchableOpacity style={styles.iosDone} onPress={() => setShowEnd(false)}>
                  <Text style={styles.iosDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Stops</Text>
            <Text style={styles.label}>Search destinations</Text>
            <IconFieldRow icon={<JamIcon name="search" size={18} color={MUTED} />}>
              <TextInput
                style={styles.inputBare}
                placeholder="Look up a barangay or landmark…"
                placeholderTextColor={PLACEHOLDER}
                value={searchDestinations}
                onChangeText={setSearchDestinations}
                accessibilityLabel="Search destinations"
              />
            </IconFieldRow>

            <Text style={[styles.label, styles.labelSpaced]}>Ordered stops</Text>
            {destinations.map((line, index) => (
              <View key={index} style={styles.stopBlock}>
                <Text style={styles.stopIndex}>{index + 1}</Text>
                <View style={styles.stopInputWrap}>
                  <IconFieldRow icon={<JamIcon name="map-marker" size={18} color={MUTED} />}>
                    <TextInput
                      style={styles.inputBare}
                      placeholder={`Stop ${index + 1}`}
                      placeholderTextColor={PLACEHOLDER}
                      value={line}
                      onChangeText={(t) => updateDestination(index, t)}
                      accessibilityLabel={`Destination ${index + 1}`}
                    />
                  </IconFieldRow>
                </View>
                {destinations.length > 1 ? (
                  <TouchableOpacity
                    style={styles.removeStop}
                    onPress={() => removeDestination(index)}
                    accessibilityLabel={`Remove stop ${index + 1}`}
                  >
                    <JamIcon ionicon="trash-outline" size={20} color="#C45C5C" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}

            <TouchableOpacity style={styles.addMoreBtn} onPress={addDestinationRow} activeOpacity={0.88}>
              <JamIcon ionicon="add-circle-outline" size={22} color={TEAL} />
              <Text style={styles.addMoreText}>Add stop</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.publishBtn} onPress={publish} activeOpacity={0.92}>
            <Text style={styles.publishText}>Publish itinerary</Text>
          </TouchableOpacity>
          <Text style={styles.footnote}>Preview — full sync with lists may come in a later release.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    gap: 14,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: TEAL,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: TITLE,
    marginBottom: 8,
  },
  labelSpaced: {
    marginTop: 16,
  },
  helper: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: MUTED,
    marginTop: 8,
    lineHeight: 18,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: TITLE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fafaf8',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateCol: { flex: 1, minWidth: 0 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fafaf8',
  },
  dateBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: TITLE,
    flex: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafaf8',
  },
  fieldInner: { flex: 1, minWidth: 0 },
  inputBare: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: TITLE,
    paddingVertical: 4,
  },
  stopBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stopIndex: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: MUTED,
    width: 22,
    textAlign: 'center',
  },
  stopInputWrap: { flex: 1, minWidth: 0 },
  removeStop: {
    padding: 8,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 163, 127, 0.35)',
    backgroundColor: 'rgba(16, 163, 127, 0.08)',
  },
  addMoreText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: TEAL,
  },
  publishBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: TEAL,
    borderRadius: 16,
    marginTop: 4,
  },
  publishText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  footnote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  iosModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  iosBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  iosDone: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  iosDoneText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: TEAL,
  },
});

export default CreateItineraryScreen;
