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
import { scaleByContent, isSmallDevice } from '../../utils/responsive';
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
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  questionContainer: {
    flex: 1,
    marginVertical: scaleByContent(20, 'spacing'),
    maxHeight: isSmallScreen ? 300 : 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(24, 'text'),
    color: '#2E2E2E',
    textAlign: 'center',
    lineHeight: scaleByContent(32, 'text'),
    marginBottom: scaleByContent(20, 'spacing'),
  },
  bottleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleByContent(10, 'spacing'),
  },
  bottleImage: {
    width: 220,
    height: 220,
  },
  spinButton: {
    position: 'absolute',
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    transform: [{ rotate: '-3deg' }],
  },
  spinButtonText: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(13, 'text'),
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
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    borderTopLeftRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    transform: [{ rotate: '-2deg' }],
  },
  skipButtonText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    borderTopLeftRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    transform: [{ rotate: '2deg' }],
  },
  continueButtonText: {
    fontSize: scaleByContent(12, 'text'),
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
