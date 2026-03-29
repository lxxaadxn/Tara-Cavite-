import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JamIcon } from '../components/JamIcon';

const HEADER_GREEN = '#7EA00E';
const INPUT_BORDER = '#D5D7DA';
const HELPER = '#646464';
const PLACEHOLDER = '#717680';
const PUBLISH_TEAL = '#1F4F59';
const ADD_MORE_BG = 'rgba(126, 160, 14, 0.5)';
const ADD_MORE_TEXT = '#213502';
const ICON_GRAY = '#646464';
const H_PAD = 16;

function IconFieldRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.inputShell}>
      {icon}
      <View style={styles.inputInner}>{children}</View>
    </View>
  );
}

const CreateItineraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchDestinations, setSearchDestinations] = useState('');
  const [destinations, setDestinations] = useState<string[]>(['', '']);

  const updateDestination = (index: number, value: string) => {
    setDestinations((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addDestinationRow = () => {
    setDestinations((prev) => [...prev, '']);
  };

  const publish = () => {
    if (!title.trim()) {
      Alert.alert('Itinerary title', 'Please enter an itinerary title.');
      return;
    }
    Alert.alert('Published', 'Your itinerary has been saved.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 14 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerSide}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <JamIcon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} pointerEvents="none">
            Create Itinerary
          </Text>
          <View style={styles.headerSide} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 28 + Math.max(insets.bottom, 12) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Itinerary Title</Text>
          <View style={styles.inputShell}>
            <View style={styles.inputInner}>
              <TextInput
                style={styles.inputText}
                placeholder="e.g Hidden Gems"
                placeholderTextColor={PLACEHOLDER}
                value={title}
                onChangeText={setTitle}
                accessibilityLabel="Itinerary title"
              />
            </View>
          </View>
          <Text style={styles.helper}>Keep it catchy! Best titles include location and vibe.</Text>

          <Text style={[styles.label, styles.labelSpaced]}>General Description</Text>
          <View style={[styles.inputShell, styles.textAreaShell]}>
            <TextInput
              style={[styles.inputText, styles.textArea]}
              placeholder="Tell us about the overall experience..."
              placeholderTextColor={PLACEHOLDER}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              accessibilityLabel="General description"
            />
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.label}>Start Date</Text>
              <IconFieldRow icon={<JamIcon name="calendar" size={18} color={ICON_GRAY} />}>
                <TextInput
                  style={styles.inputText}
                  placeholder=""
                  placeholderTextColor={PLACEHOLDER}
                  value={startDate}
                  onChangeText={setStartDate}
                  accessibilityLabel="Start date"
                />
              </IconFieldRow>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.label}>End Date</Text>
              <IconFieldRow icon={<JamIcon name="calendar" size={18} color={ICON_GRAY} />}>
                <TextInput
                  style={styles.inputText}
                  placeholder=""
                  placeholderTextColor={PLACEHOLDER}
                  value={endDate}
                  onChangeText={setEndDate}
                  accessibilityLabel="End date"
                />
              </IconFieldRow>
            </View>
          </View>

          <Text style={[styles.label, styles.labelSpaced]}>Search Destinations</Text>
          <IconFieldRow icon={<JamIcon name="search" size={18} color={ICON_GRAY} />}>
            <TextInput
              style={styles.inputText}
              placeholder=""
              placeholderTextColor={PLACEHOLDER}
              value={searchDestinations}
              onChangeText={setSearchDestinations}
              accessibilityLabel="Search destinations"
            />
          </IconFieldRow>

          <Text style={[styles.label, styles.labelSpaced]}>Destinations</Text>
          {destinations.map((line, index) => (
            <View key={index} style={styles.destRow}>
              <IconFieldRow icon={<JamIcon name="map-marker" size={18} color={ICON_GRAY} />}>
                <TextInput
                  style={styles.inputText}
                  placeholder=""
                  placeholderTextColor={PLACEHOLDER}
                  value={line}
                  onChangeText={(t) => updateDestination(index, t)}
                  accessibilityLabel={`Destination ${index + 1}`}
                />
              </IconFieldRow>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addMoreBtn}
            onPress={addDestinationRow}
            accessibilityRole="button"
            accessibilityLabel="Add more destinations"
            activeOpacity={0.85}
          >
            <Text style={styles.addMoreText}>Add More</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.publishBtn}
            onPress={publish}
            accessibilityRole="button"
            accessibilityLabel="Publish itinerary"
            activeOpacity={0.9}
          >
            <Text style={styles.publishText}>Publish Itinerary</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: HEADER_GREEN,
    paddingHorizontal: H_PAD,
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 20,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    lineHeight: 24,
    color: '#000000',
    marginBottom: 8,
  },
  labelSpaced: {
    marginTop: 18,
  },
  helper: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 24,
    color: HELPER,
    marginTop: 8,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  textAreaShell: {
    alignItems: 'flex-start',
    minHeight: 120,
    paddingVertical: 12,
  },
  inputInner: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  inputText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 24,
    color: '#000000',
    paddingVertical: 0,
  },
  textArea: {
    minHeight: 96,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  dateCol: {
    flex: 1,
    minWidth: 0,
  },
  destRow: {
    marginBottom: 10,
  },
  addMoreBtn: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: ADD_MORE_BG,
    borderRadius: 20,
  },
  addMoreText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 16,
    color: ADD_MORE_TEXT,
  },
  publishBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: PUBLISH_TEAL,
    borderRadius: 20,
  },
  publishText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 16,
    color: '#FFFFFF',
  },
});

export default CreateItineraryScreen;
