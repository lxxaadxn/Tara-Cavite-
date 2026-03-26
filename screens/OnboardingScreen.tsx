import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Theme } from '../constants/theme';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface FeatureSlide {
  title: string;
  subtitle: string;
}

const featureSlides: FeatureSlide[] = [
  {
    title: 'Explore Destinations',
    subtitle:
      'Browse tourist destinations by city and attraction type, with details, photos, and operating hours for easy trip planning.',
  },
  {
    title: 'Map View',
    subtitle:
      'View tourist spots on an integrated map and get navigation from your current location.',
  },
  {
    title: 'Plan & Save',
    subtitle:
      'Search and filter destinations by location, category, or popularity, save favorites, and create simple itineraries.',
  },
  {
    title: 'Get Around',
    subtitle:
      'Get a transportation guide with jeepneys, buses, and vans, including routes and estimated travel times within the province.',
  },
];

const STARTUP_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'calendar-outline',
  'map-outline',
  'navigate-outline',
  'compass-outline',
];

const OnboardingScreen: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showStartup, setShowStartup] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [startupIcon] = useState<keyof typeof Ionicons.glyphMap>(() => {
    const randomIndex = Math.floor(Math.random() * STARTUP_ICONS.length);
    return STARTUP_ICONS[randomIndex];
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowStartup(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  const handleNext = () => {
    if (currentIndex < featureSlides.length - 1) {
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

  if (showStartup) {
    return (
      <SafeAreaView style={styles.startupContainer}>
        <View style={styles.startupIconWrapper}>
          <Ionicons
            name={startupIcon}
            size={40}
            color={Colors.cta}
            accessibilityRole="image"
            accessibilityLabel="Startup icon"
          />
        </View>
        <View style={styles.startupLogoWrapper} accessibilityRole="header" accessibilityLabel="CaviTour title">
          <Text style={styles.startupTitleText}>CaviTour</Text>
        </View>
        <Text style={styles.startupCopyright}>© CaviTour 2026</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {featureSlides.map((slide, index) => (
          <View key={slide.title} style={styles.slide}>
            <LinearGradient
              colors={['#1F4F59', '#54C0CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            />
            <View style={styles.content}>
              <View style={styles.pictureGroup}>
                <View style={styles.pictureCircle} accessibilityRole="image" accessibilityLabel="Feature avatar icon">
                  <Ionicons name={startupIcon} size={72} color="rgba(255,255,255,0.95)" />
                </View>
              </View>

              <View style={styles.textGroup}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
              </View>

              <View style={styles.sliderGroup} accessible accessibilityRole="adjustable">
                {featureSlides.map((_, dotIndex) => (
                  <View
                    key={dotIndex}
                    style={[
                      styles.sliderDot,
                      dotIndex === index && styles.sliderDotActive,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  title="GET STARTED"
                  onPress={index === featureSlides.length - 1 ? handleGetStarted : handleNext}
                  accessibilityLabel={
                    index === featureSlides.length - 1
                      ? 'Finish onboarding and get started'
                      : 'Go to next feature'
                  }
                  style={styles.ctaButton}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  startupContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startupIconWrapper: {
    position: 'absolute',
    top: 116,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  startupLogoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  startupTitleText: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.cta,
    lineHeight: 48,
  },
  startupCopyright: {
    position: 'absolute',
    bottom: 40,
    fontSize: 14,
    color: '#535862',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: 320,
    height: 638,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pictureGroup: {
    width: 315,
    height: 315,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pictureCircle: {
    width: 315,
    height: 315,
    borderRadius: 179.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pictureImage: {
    width: '100%',
    height: '100%',
  },
  textGroup: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: 28,
  },
  sliderGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  sliderDot: {
    width: 29,
    height: 3,
    borderRadius: 19.5,
    backgroundColor: 'rgba(175,167,167,1)',
    marginHorizontal: 4,
  },
  sliderDotActive: {
    backgroundColor: Colors.white,
  },
  buttonContainer: {
    width: 318,
    marginTop: Theme.spacing.sm,
  },
  ctaButton: {
    width: 318,
    height: 48,
    minHeight: 48,
    borderRadius: 10,
  },
});

export default OnboardingScreen;
