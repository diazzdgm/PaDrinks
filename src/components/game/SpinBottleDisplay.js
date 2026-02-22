import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import { scaleByContent, isSmallDevice, isShortHeightDevice, isTablet } from '../../utils/responsive';
import audioService from '../../services/AudioService';

const SpinBottleDisplay = ({
  question,
  onComplete,
  onSkipDynamic,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const [confettiParticles, setConfettiParticles] = useState([]);

  const spinValue = useRef(new Animated.Value(0)).current;
  const confettiAnimValues = useRef([]).current;

  const spinBottle = async () => {
    if (isSpinning) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {}

    setShowButton(false);

    await audioService.playSoundEffect(
      require('../../../assets/sounds/bottle.spin.mp3'),
      { volume: 0.8 }
    );

    setIsSpinning(true);
    spinValue.setValue(0);

    const randomExtraDegrees = Math.random() * 360;
    const totalRotation = 1800 + randomExtraDegrees;

    Animated.timing(spinValue, {
      toValue: totalRotation,
      duration: 5000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      await audioService.playSoundEffect(
        require('../../../assets/sounds/school.bell.mp3'),
        { volume: 0.8 }
      );

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {}

      createConfetti();

      setIsSpinning(false);
      setShowButton(true);
    });
  };

  const createConfetti = () => {
    confettiAnimValues.length = 0;

    const particles = [];
    const particleColors = [
      theme.colors.postItYellow,
      theme.colors.postItGreen,
      theme.colors.postItPink,
      theme.colors.postItBlue,
    ];

    for (let i = 0; i < 50; i++) {
      const animValue = new Animated.Value(0);
      confettiAnimValues.push(animValue);

      particles.push({
        id: i,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        x: Math.random() * 100,
        rotation: Math.random() * 360,
        animValue,
      });

      Animated.timing(animValue, {
        toValue: 1,
        duration: 2000 + Math.random() * 1000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }

    setConfettiParticles(particles);

    setTimeout(() => {
      setConfettiParticles([]);
    }, 3000);
  };

  const handleContinue = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    await audioService.playSoundEffect(
      require('../../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );

    onComplete();
  };

  const handleSkip = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    await audioService.playSoundEffect(
      require('../../../assets/sounds/wine-pop.mp3'),
      { volume: 0.8 }
    );

    onSkipDynamic();
  };

  return (
    <>
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>{question.instruction}</Text>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{question.text}</Text>

        <View style={styles.bottleContainer}>
          <Animated.View
            style={{
              transform: [{
                rotate: spinValue.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                })
              }]
            }}
          >
            <Image
              source={require('../../../assets/images/Bottle.Spin.png')}
              style={styles.bottleImage}
              resizeMode="contain"
            />
          </Animated.View>

          {showButton && (
            <TouchableOpacity
              style={styles.spinButton}
              onPress={spinBottle}
              disabled={isSpinning}
              activeOpacity={0.8}
            >
              <Text style={styles.spinButtonText}>Girar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Pasar Dinámica</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>

      {confettiParticles.map((particle) => {
        const translateY = particle.animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 900],
        });

        const opacity = particle.animValue.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [1, 1, 0],
        });

        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.confettiParticle,
              {
                left: `${particle.x}%`,
                backgroundColor: particle.color,
                transform: [
                  { translateY },
                  { rotate: `${particle.rotation}deg` },
                ],
                opacity,
              },
            ]}
          />
        );
      })}
    </>
  );
};

const isSmallScreen = isSmallDevice();
const isShortHeight = isShortHeightDevice();
const isTabletScreen = isTablet();

const styles = StyleSheet.create({
  instructionContainer: {
    alignItems: 'center',
    marginBottom: scaleByContent(30, 'spacing'),
    backgroundColor: theme.colors.postItPink,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 20,
    borderTopLeftRadius: 5,
    paddingVertical: scaleByContent(15, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '1deg' }],
  },
  instructionText: {
    fontSize: scaleByContent(isTabletScreen ? 12 : 18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  questionContainer: {
    flex: 1,
    marginVertical: scaleByContent(20, 'spacing'),
    maxHeight: isShortHeight ? scaleByContent(200, 'interactive') : isSmallScreen ? scaleByContent(300, 'interactive') : scaleByContent(400, 'interactive'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(isTabletScreen ? 16 : 24, 'text'),
    color: '#2E2E2E',
    textAlign: 'center',
    lineHeight: scaleByContent(isTabletScreen ? 22 : 32, 'text'),
    marginBottom: scaleByContent(20, 'spacing'),
  },
  bottleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleByContent(10, 'spacing'),
  },
  bottleImage: {
    width: scaleByContent(isShortHeight ? 150 : 220, 'interactive'),
    height: scaleByContent(isShortHeight ? 150 : 220, 'interactive'),
  },
  spinButton: {
    position: 'absolute',
    width: scaleByContent(55, 'interactive'),
    height: scaleByContent(55, 'interactive'),
    borderRadius: scaleByContent(28, 'spacing'),
    backgroundColor: theme.colors.postItGreen,
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 5,
    transform: [{ rotate: '-3deg' }],
  },
  spinButtonText: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(isTabletScreen ? 9 : 13, 'text'),
    color: '#000000',
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: scaleByContent(20, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
  },
  skipButton: {
    backgroundColor: theme.colors.postItPink,
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    borderRadius: scaleByContent(8, 'spacing'),
    borderTopLeftRadius: scaleByContent(3, 'spacing'),
    paddingVertical: scaleByContent(6, 'spacing'),
    paddingHorizontal: scaleByContent(18, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.2,
    shadowRadius: scaleByContent(2, 'spacing'),
    elevation: 2,
    transform: [{ rotate: '-2deg' }],
  },
  skipButtonText: {
    fontSize: scaleByContent(isTabletScreen ? 9 : 12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    borderRadius: scaleByContent(8, 'spacing'),
    borderTopLeftRadius: scaleByContent(3, 'spacing'),
    paddingVertical: scaleByContent(6, 'spacing'),
    paddingHorizontal: scaleByContent(22, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.2,
    shadowRadius: scaleByContent(2, 'spacing'),
    elevation: 2,
    transform: [{ rotate: '2deg' }],
  },
  continueButtonText: {
    fontSize: scaleByContent(isTabletScreen ? 9 : 12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  confettiParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
    top: -300,
  },
});

export default SpinBottleDisplay;
