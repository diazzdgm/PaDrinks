import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { Haptics } from '../../utils/platform';
import { theme } from '../../styles/theme';
import { scaleByContent, scaleBorder, isSmallDevice, isShortHeightDevice, isTablet } from '../../utils/responsive';
import audioService from '../../services/AudioService';

const PrizeRouletteDisplay = ({
  question,
  player1Name,
  onComplete,
  onSkipDynamic,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [confettiParticles, setConfettiParticles] = useState([]);

  const spinValue = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnimValues = useRef([]).current;

  const prizes = question.prizes || [
    'Reparte shot a todos',
    'Negar 3 shots',
    'Desviar shot',
    'Reparte shot a un jugador',
    'Multiplica el shot de alguien',
    'Negar 1 shot',
  ];

  const colors = [
    theme.colors.postItYellow,
    theme.colors.postItGreen,
    theme.colors.postItPink,
    theme.colors.postItBlue,
    theme.colors.postItYellow,
    theme.colors.postItGreen,
  ];

  const createWedgePath = (index, total, radius) => {
    const angle = (2 * Math.PI) / total;
    const startAngle = index * angle - Math.PI / 2;
    const endAngle = startAngle + angle;

    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const getTextPosition = (index, total, radius) => {
    const angle = (2 * Math.PI) / total;
    const middleAngle = index * angle - Math.PI / 2 + angle / 2;
    const textRadius = radius * 0.68;

    const x = radius + textRadius * Math.cos(middleAngle);
    const y = radius + textRadius * Math.sin(middleAngle);

    const rotation = (index * 360 / total) + (180 / total) - 90;

    return { x, y, rotation };
  };

  const splitTextIntoLines = (text, maxLength = 15) => {
    if (text.length <= maxLength) {
      return [text];
    }

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word, index) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= maxLength) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }

      if (index === words.length - 1 && currentLine) {
        lines.push(currentLine);
      }
    });

    return lines.slice(0, 2);
  };

  const spinWheel = async () => {
    if (isSpinning) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {}

    await audioService.playSoundEffect('roulette');

    setIsSpinning(true);
    spinValue.setValue(0);

    const randomPrizeIndex = Math.floor(Math.random() * prizes.length);
    const degreesPerSection = 360 / prizes.length;
    const targetDegrees = 360 - (randomPrizeIndex * degreesPerSection + degreesPerSection / 2);
    const totalRotation = 1800 + targetDegrees;

    Animated.timing(spinValue, {
      toValue: totalRotation,
      duration: 5000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      setSelectedPrize(prizes[randomPrizeIndex]);

      await audioService.playSoundEffect('bell');

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {}

      createConfetti();

      setTimeout(() => {
        setShowPrizeModal(true);
        animateModalIn();
      }, 500);

      setIsSpinning(false);
    });
  };

  const createConfetti = () => {
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

  const animateModalIn = () => {
    modalOpacityAnim.setValue(0);

    Animated.timing(modalOpacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const animateModalOut = (callback) => {
    Animated.timing(modalOpacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      if (callback) callback();
    });
  };

  const closePrizeModal = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    animateModalOut(() => {
      setShowPrizeModal(false);
    });
  };

  const handleContinue = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    await audioService.playSoundEffect('beer');

    onComplete();
  };

  const handleSkip = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    await audioService.playSoundEffect('wine');

    onSkipDynamic();
  };

  const questionText = question.text.replace('{player1}', player1Name);

  return (
    <>
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>{question.instruction}</Text>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{questionText}</Text>

        <View style={styles.rouletteContainer}>
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
            <Svg width={scaleByContent(isShortHeight ? 140 : 200, 'interactive')} height={scaleByContent(isShortHeight ? 140 : 200, 'interactive')} viewBox="0 0 200 200">
              <G>
                {prizes.map((prize, index) => {
                  const textPos = getTextPosition(index, prizes.length, 100);
                  const lines = splitTextIntoLines(prize);
                  const lineHeight = 8;
                  const offsetY = lines.length === 2 ? -lineHeight / 2 : 0;

                  return (
                    <G key={index}>
                      <Path
                        d={createWedgePath(index, prizes.length, 100)}
                        fill={colors[index]}
                        stroke="#000000"
                        strokeWidth="2"
                      />
                      {lines.map((line, lineIndex) => (
                        <SvgText
                          key={lineIndex}
                          x={textPos.x}
                          y={textPos.y + offsetY + (lineIndex * lineHeight)}
                          fill="#000000"
                          fontSize="9"
                          fontFamily="Kalam-Bold"
                          textAnchor="middle"
                          transform={`rotate(${textPos.rotation} ${textPos.x} ${textPos.y})`}
                        >
                          {line}
                        </SvgText>
                      ))}
                    </G>
                  );
                })}
              </G>

              <Circle cx="100" cy="100" r="35" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
            </Svg>
          </Animated.View>

          <TouchableOpacity
            style={styles.spinButton}
            onPress={spinWheel}
            disabled={isSpinning}
            activeOpacity={0.8}
          >
            <Text style={styles.spinButtonText}>
              {isSpinning ? 'Girando...' : 'Girar'}
            </Text>
          </TouchableOpacity>

          <View style={styles.pointer} />
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Saltar Dinámica</Text>
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
          outputRange: [-100, 600],
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

      {showPrizeModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: modalOpacityAnim,
                },
              ]}
            >
            <View style={styles.modalPaperBackground}>
              <View style={styles.modalNotebookLines}>
                {[...Array(8)].map((_, index) => (
                  <View
                    key={index}
                    style={[styles.modalLine, { top: 20 + index * 25 }]}
                  />
                ))}
              </View>
              <View style={styles.modalRedMarginLine} />
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🎉 ¡Tu premio! 🎉</Text>
              <Text style={styles.modalPrize}>{selectedPrize}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={closePrizeModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
        </View>
      )}
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
    borderWidth: scaleBorder(3),
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
    transform: [{ rotate: '0deg' }],
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
  rouletteContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleByContent(10, 'spacing'),
  },
  spinButton: {
    position: 'absolute',
    width: scaleByContent(70, 'interactive'),
    height: scaleByContent(70, 'interactive'),
    borderRadius: scaleBorder(35),
    backgroundColor: theme.colors.postItGreen,
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 5,
  },
  spinButtonText: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(isTabletScreen ? 10 : 14, 'text'),
    color: '#000000',
    textAlign: 'center',
  },
  pointer: {
    position: 'absolute',
    top: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 20,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D32F2F',
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
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(8),
    borderTopLeftRadius: scaleBorder(3),
    paddingVertical: scaleByContent(6, 'spacing'),
    paddingHorizontal: scaleByContent(18, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.2,
    shadowRadius: scaleByContent(2, 'spacing'),
    elevation: 2,
    transform: [{ rotate: '0deg' }],
  },
  skipButtonText: {
    fontSize: scaleByContent(isTabletScreen ? 9 : 12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(8),
    borderTopLeftRadius: scaleBorder(3),
    paddingVertical: scaleByContent(6, 'spacing'),
    paddingHorizontal: scaleByContent(22, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.2,
    shadowRadius: scaleByContent(2, 'spacing'),
    elevation: 2,
    transform: [{ rotate: '0deg' }],
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
    top: 0,
  },
  absoluteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },

  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#F8F6F0',
    borderRadius: 20,
    borderTopLeftRadius: 5,
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    transform: [{ rotate: '0deg' }],
  },
  modalPaperBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F6F0',
    borderRadius: 17,
    borderTopLeftRadius: 2,
    overflow: 'hidden',
  },
  modalNotebookLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalLine: {
    position: 'absolute',
    left: 40,
    right: 20,
    height: 1,
    backgroundColor: '#D3E3F4',
  },
  modalRedMarginLine: {
    position: 'absolute',
    left: 30,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFB3BA',
    opacity: 0.3,
  },
  modalContent: {
    padding: scaleByContent(30, 'spacing'),
    alignItems: 'center',
    zIndex: 1,
  },
  modalTitle: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(isTabletScreen ? 16 : 24, 'text'),
    color: '#000000',
    marginBottom: scaleByContent(20, 'spacing'),
    textAlign: 'center',
  },
  modalPrize: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(isTabletScreen ? 22 : 32, 'text'),
    color: '#D32F2F',
    marginBottom: scaleByContent(30, 'spacing'),
    textAlign: 'center',
    lineHeight: scaleByContent(isTabletScreen ? 28 : 40, 'text'),
  },
  modalButton: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(8),
    borderTopLeftRadius: scaleBorder(3),
    paddingVertical: scaleByContent(8, 'spacing'),
    paddingHorizontal: scaleByContent(30, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.2,
    shadowRadius: scaleByContent(2, 'spacing'),
    elevation: 2,
    transform: [{ rotate: '0deg' }],
  },
  modalButtonText: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(isTabletScreen ? 12 : 18, 'text'),
    color: '#000000',
    textAlign: 'center',
  },
});

export default PrizeRouletteDisplay;
