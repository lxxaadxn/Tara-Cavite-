import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Theme } from '../constants/Theme';
import { Button } from '../components/Button';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  title: string;
  subtitle: string;
  illustration: string;
}

const slides: OnboardingSlide[] = [
  {
    title: 'Commute',
    subtitle: 'Plan your trip with step-by-step terminal or roadside routes, including clear fare and time estimates.',
    illustration: '🚌',
  },
  {
    title: 'Terminals',
    subtitle: 'Access a directory of Cavite\'s transport hubs with available routes, vehicle types, and nearby landmarks.',
    illustration: '🏢',
  },
  {
    title: 'Saved Routes',
    subtitle: 'Bookmark your frequent trips and preferred terminals for instant, one-tap access.',
    illustration: '⭐',
  },
];

const OnboardingScreen: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('onboardingComplete', 'true');
      // Navigation will be handled by App.tsx
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/cavitour-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.illustrationContainer}>
              <Text style={styles.illustration}>{slide.illustration}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title={currentIndex === slides.length - 1 ? 'GET STARTED' : 'NEXT'}
            onPress={handleNext}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  logoContainer: {
    paddingTop: 50,
    alignItems: 'center',
    paddingBottom: Theme.spacing.md,
  },
  logo: {
    height: 36,
    width: 160,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  illustrationContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
  },
  illustration: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    opacity: 0.3,
    marginHorizontal: 4,
  },
  activeDot: {
    opacity: 1,
    width: 24,
  },
  buttonContainer: {
    width: '100%',
  },
});

export default OnboardingScreen;
