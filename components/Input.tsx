import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { Colors, Theme } from '../constants/theme';

interface InputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.light}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Theme.spacing.xs,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.text.light,
    paddingVertical: Theme.spacing.sm,
    fontSize: 16,
    color: Colors.text.primary,
  },
});
