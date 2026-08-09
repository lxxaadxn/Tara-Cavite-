import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { GoogleLogoMark } from './GoogleLogoMark';
import { Colors } from '../constants/theme';

const MUTED = '#6B7280';
const BORDER = 'rgba(17, 24, 39, 0.12)';

type Mode = 'sign-in' | 'sign-up';

type Props = {
  visible: boolean;
  mode?: Mode;
  onCancel: () => void;
  onContinue: () => void;
};

/**
 * Mirrors apps/web LoginPage / SignupPage Google consent dialog.
 */
export function GoogleConsentModal({ visible, mode = 'sign-in', onCancel, onContinue }: Props) {
  const isSignUp = mode === 'sign-up';
  const title = isSignUp ? 'Sign up with Google' : 'Sign in with Google';
  const description = isSignUp
    ? 'Allow Tara, Cavite! to create or link your account with Google? You will be redirected to Google to continue.'
    : 'Allow Tara, Cavite! to sign you in with Google? You will be redirected to Google to continue.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel} accessibilityRole="button">
        <View
          style={styles.card}
          // Prevent taps on the card from dismissing via the overlay Pressable.
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.logoRing} accessibilityElementsHidden>
            <GoogleLogoMark size={28} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Cancel Google sign in"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={onContinue}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 384,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 60,
    elevation: 8,
  },
  logoRing: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    textAlign: 'center',
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text.primary,
  },
  continueBtn: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  continueText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
