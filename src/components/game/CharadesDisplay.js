import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import { scaleByContent, isSmallDevice } from '../../utils/responsive';
import audioService from '../../services/AudioService';

const CharadesDisplay = ({
  question,
  player1Name,
  player2Name,
  onComplete,
  onSkipDynamic,
}) => {
  const [timerStarted, setTimerStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [showPhraseModal, setShowPhraseModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [timerDisabled, setTimerDisabled] = useState(false);
  const [phraseDisabled, setPhraseDisabled] = useState(false);

  const timerInterval = useRef(null);
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timeRemaining === 0 && timerStarted) {
      handleTimerEnd();
    }
  }, [timeRemaining, timerStarted]);

  const handleTimerEnd = async () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    setTimerStarted(false);

    await audioService.playSoundEffect(
      require('../../../assets/sounds/school.bell.mp3'),
      { volume: 0.8 }
    );

    setShowTimeUpModal(true);
    animateModalIn();
  };

  const startTimer = async () => {
    if (timerDisabled || !phraseDisabled) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    await audioService.playSoundEffect(
      require('../../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );

    setTimerStarted(true);
    setTimerDisabled(true);
    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const showRandomPhrase = async () => {
    if (phraseDisabled) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    await audioService.playSoundEffect(
      require('../../../assets/sounds/wine-pop.mp3'),
      { volume: 0.8 }
    );

    const phrases = question.phrases || [];
    const randomIndex = Math.floor(Math.random() * phrases.length);
    setSelectedPhrase(phrases[randomIndex]);
    setShowPhraseModal(true);
    setPhraseDisabled(true);
    animateModalIn();
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

  const closePhraseModal = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    animateModalOut(() => {
      setShowPhraseModal(false);
    });
  };

  const closeTimeUpModal = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    animateModalOut(() => {
      setShowTimeUpModal(false);
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContinue = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    await audioService.playSoundEffect(
      require('../../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );

    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

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

    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    onSkipDynamic();
  };

  const questionText = question.text
    .replace('{player1}', player1Name)
    .replace('{player2}', player2Name);

  return (
    <>
      {/* Instrucción de la dinámica con diseño post-it */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          {question.dynamicInstruction || 'Si no adivinan la palabra ambos toman shot'}
        </Text>
      </View>

      {/* Pregunta principal */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{questionText}</Text>

        {/* Botones de charadas dentro del questionContainer */}
        <View style={styles.charadesButtonsRow}>
          <TouchableOpacity
            style={[
              styles.phraseButton,
              phraseDisabled && styles.buttonDisabled,
            ]}
            onPress={showRandomPhrase}
            disabled={phraseDisabled}
            activeOpacity={0.8}
          >
            <Text style={styles.phraseButtonText}>Mostrar Frase</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timerButton,
              (timerDisabled || !phraseDisabled) && styles.buttonDisabled,
            ]}
            onPress={startTimer}
            disabled={timerDisabled || !phraseDisabled}
            activeOpacity={0.8}
          >
            <Text style={styles.timerButtonText}>
              {timerStarted ? formatTime(timeRemaining) : 'Empezar Timer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Botones de acción */}
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

      {showPhraseModal && (
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
            {/* Fondo de papel del modal */}
            <View style={styles.modalPaperBackground}>
              <View style={styles.modalNotebookLines}>
                {[...Array(15)].map((_, index) => (
                  <View
                    key={index}
                    style={[styles.modalLine, { top: 20 + (index * 20) }]}
                  />
                ))}
              </View>
              <View style={styles.modalRedMarginLine} />
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Tu frase es:</Text>
              <Text style={styles.modalPhrase}>{selectedPhrase}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={closePhraseModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
        </View>
      )}

      {showTimeUpModal && (
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
            {/* Fondo de papel del modal */}
            <View style={styles.modalPaperBackground}>
              <View style={styles.modalNotebookLines}>
                {[...Array(15)].map((_, index) => (
                  <View
                    key={index}
                    style={[styles.modalLine, { top: 20 + (index * 20) }]}
                  />
                ))}
              </View>
              <View style={styles.modalRedMarginLine} />
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>⏰</Text>
              <Text style={styles.modalPhrase}>Se acabó el tiempo</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={closeTimeUpModal}
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
    fontSize: scaleByContent(26, 'text'),
    color: '#2E2E2E',
    textAlign: 'center',
    lineHeight: scaleByContent(34, 'text'),
    marginBottom: scaleByContent(15, 'spacing'),
  },
  charadesButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleByContent(20, 'spacing'),
    marginTop: scaleByContent(20, 'spacing'),
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: scaleByContent(20, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
  },
  phraseButton: {
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
  phraseButtonText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  timerButton: {
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
  timerButtonText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
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

  // Estilos de modal (diseño de papel notebook)
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
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#F8F6F0',
    borderRadius: 20,
    borderTopLeftRadius: 5,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    transform: [{ rotate: '-0.5deg' }],
    overflow: 'hidden',
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
    fontSize: scaleByContent(24, 'text'),
    color: '#000000',
    marginBottom: scaleByContent(20, 'spacing'),
    textAlign: 'center',
  },
  modalPhrase: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(32, 'text'),
    color: '#D32F2F',
    marginBottom: scaleByContent(30, 'spacing'),
    textAlign: 'center',
    lineHeight: scaleByContent(40, 'text'),
  },
  modalButton: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    borderTopLeftRadius: 3,
    paddingVertical: 8,
    paddingHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    transform: [{ rotate: '-1deg' }],
  },
  modalButtonText: {
    fontFamily: theme.fonts.primaryBold,
    fontSize: scaleByContent(18, 'text'),
    color: '#000000',
    textAlign: 'center',
  },
});

export default CharadesDisplay;
