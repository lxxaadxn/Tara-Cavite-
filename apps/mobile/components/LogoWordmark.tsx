import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const BUNDLED_MARK = require('../assets/images/brand-mark.png');

type Props = {
  light?: boolean;
  markSize?: number;
  wordFontSize?: number;
};

/** Brand mark plus Bebas Neue “Tara, Cavite!” on one line. */
export function LogoWordmark({ light = false, markSize = 36, wordFontSize = 30 }: Props) {
  const tara = light ? '#39A98F' : '#10A37F';
  const cavite = light ? '#AACBC4' : '#1B8A70';
  const wordLineHeight = Math.round(wordFontSize * 1.2);

  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Tara, Cavite!">
      <Image
        source={BUNDLED_MARK}
        style={[styles.mark, { width: markSize, height: markSize }]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.words}>
        <Text style={[styles.word, { color: tara, fontSize: wordFontSize, lineHeight: wordLineHeight }]}>
          Tara
        </Text>
        <Text style={[styles.word, { color: cavite, fontSize: wordFontSize, lineHeight: wordLineHeight }]}>
          , Cavite!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  mark: {
    backgroundColor: 'transparent',
  },
  words: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  word: {
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 0.4,
  },
});
