import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import { scaleByContent, isSmallDevice, isShortHeightDevice } from '../../utils/responsive';
import {
  initializePreferenceVote,
  setPreferenceVotePhase,
  recordPreferenceVote,
  nextPreferenceVotePlayer,
  skipPreferenceVotePlayer,
  resetPreferenceVoteState,
} from '../../store/gameSlice';
import { getGameEngine } from '../../game/GameEngine';
import audioService from '../../services/AudioService';

const PreferenceVoteDisplay = ({
  question,
  allGamePlayers,
  onComplete,
  onSkipDynamic,
}) => {
  const dispatch = useDispatch();
  const gameEngine = getGameEngine();
  const isSmallScreen = isSmallDevice();

  const { preferenceVoteState } = useSelector((state) => state.game);
  const [selectedOption, setSelectedOption] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!preferenceVoteState.phase && question) {
      const eligiblePlayers = gameEngine.filterPlayersByGender(
        question.genderRestriction
      );

      if (eligiblePlayers.length < 2) {
        onSkipDynamic();
        return;
      }

      dispatch(
        initializePreferenceVote({
          eligiblePlayers,
          option1: question.option1,
          option2: question.option2,
          questionData: question,
        })
      );
    }
  }, [question]);

  const playBeerSound = async () => {
    await audioService.playSoundEffect(
      require('../../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );
  };

  const playWinePopSound = async () => {
    await audioService.playSoundEffect(
      require('../../../assets/sounds/wine-pop.mp3'),
      { volume: 0.8 }
    );
  };

  const handleContinueFromPassing = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    playBeerSound();
    dispatch(setPreferenceVotePhase('voting'));
    setSelectedOption(null);
  };

  const handleSkipPlayer = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    playWinePopSound();

    const newIndex = preferenceVoteState.currentPlayerIndex + 1;

    if (
      preferenceVoteState.playerVotes.length === 0 &&
      newIndex >= preferenceVoteState.eligiblePlayers.length - 1
    ) {
      dispatch(resetPreferenceVoteState());
      onSkipDynamic();
      return;
    }

    dispatch(nextPreferenceVotePlayer());

    if (newIndex >= preferenceVoteState.eligiblePlayers.length) {
      dispatch(setPreferenceVotePhase('returning_phone'));
    } else {
      dispatch(setPreferenceVotePhase('passing_phone'));
    }
  };

  const handleOptionSelect = (option) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    playWinePopSound();
    setSelectedOption(option);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleConfirmVote = async () => {
    if (!selectedOption) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {}

    playBeerSound();

    const currentPlayer =
      preferenceVoteState.eligiblePlayers[
        preferenceVoteState.currentPlayerIndex
      ];

    dispatch(
      recordPreferenceVote({
        playerId: currentPlayer.id,
        playerName: currentPlayer.name || currentPlayer.nickname,
        selectedOption,
      })
    );

    dispatch(nextPreferenceVotePlayer());
    setSelectedOption(null);

    const newIndex = preferenceVoteState.currentPlayerIndex + 1;

    if (newIndex >= preferenceVoteState.eligiblePlayers.length) {
      dispatch(setPreferenceVotePhase('returning_phone'));
    } else {
      dispatch(setPreferenceVotePhase('passing_phone'));
    }
  };

  const handleContinueFromReturning = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    playBeerSound();
    dispatch(setPreferenceVotePhase('results'));
  };

  const handleContinueFromResults = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    playBeerSound();
    dispatch(setPreferenceVotePhase('penalty'));
  };

  const handleContinueFromPenalty = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {}

    playBeerSound();
    dispatch(resetPreferenceVoteState());
    onComplete();
  };

  const calculateResults = () => {
    const option1Votes = preferenceVoteState.playerVotes.filter(
      (v) => v.selectedOption === 'option1'
    );
    const option2Votes = preferenceVoteState.playerVotes.filter(
      (v) => v.selectedOption === 'option2'
    );

    const option1Count = option1Votes.length;
    const option2Count = option2Votes.length;

    let losers = [];

    if (option1Count < option2Count) {
      losers = option1Votes.map((v) => v.playerName);
    } else if (option2Count < option1Count) {
      losers = option2Votes.map((v) => v.playerName);
    }

    return {
      option1Count,
      option2Count,
      losers,
    };
  };

  if (!preferenceVoteState.phase || !question) {
    return null;
  }

  if (preferenceVoteState.phase === 'passing_phone') {
    const currentPlayer =
      preferenceVoteState.eligiblePlayers[
        preferenceVoteState.currentPlayerIndex
      ];
    const playerName = currentPlayer?.name || currentPlayer?.nickname || 'Jugador';

    return (
      <>
        {/* Instrucción de la dinámica */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

        {/* Contenido principal centrado */}
        <View style={styles.questionContainer}>
          <View style={styles.passingPhoneContainer}>
            <Text style={styles.passingPhoneText}>
              Pasa el celular a
            </Text>
            <Text style={[styles.passingPhoneText, styles.playerNameHighlight]}>
              {playerName}
            </Text>
            <Text style={styles.passingPhoneText}>
              para que vote
            </Text>
          </View>
        </View>

        {/* Botones de acción */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkipDynamic}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Pasar Dinámica</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipPlayerButton}
            onPress={handleSkipPlayer}
            activeOpacity={0.8}
          >
            <Text style={styles.skipPlayerButtonText}>Pasar Jugador</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueFromPassing}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (preferenceVoteState.phase === 'voting') {
    const currentPlayer =
      preferenceVoteState.eligiblePlayers[
        preferenceVoteState.currentPlayerIndex
      ];
    const playerName = currentPlayer?.name || currentPlayer?.nickname || 'Jugador';

    return (
      <>
        {/* Instrucción de la dinámica */}
        <View style={styles.instructionContainerVoting}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

        {/* Contenido principal centrado */}
        <View style={styles.questionContainerVoting}>
          <View style={styles.votingContainer}>
            <Text style={styles.questionTitle}>
              {playerName} {question.text}
            </Text>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  styles.optionButtonLeft,
                  selectedOption === 'option1' && styles.optionButtonSelected,
                ]}
                onPress={() => handleOptionSelect('option1')}
                activeOpacity={0.8}
              >
                <Text style={styles.optionButtonText}>{question.option1}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  styles.optionButtonRight,
                  selectedOption === 'option2' && styles.optionButtonSelected,
                ]}
                onPress={() => handleOptionSelect('option2')}
                activeOpacity={0.8}
              >
                <Text style={styles.optionButtonText}>{question.option2}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.questionEmoji}>{question.emoji}</Text>
            <Text style={styles.instructionAction}>{question.instruction}</Text>
          </View>
        </View>

        {/* Botones de acción */}
        <View style={styles.buttonsContainerRight}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedOption && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirmVote}
            activeOpacity={selectedOption ? 0.8 : 1}
            disabled={!selectedOption}
          >
            <Text style={[
              styles.continueButtonText,
              !selectedOption && styles.confirmButtonTextDisabled
            ]}>
              Continuar
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (preferenceVoteState.phase === 'returning_phone') {
    return (
      <>
        {/* Instrucción de la dinámica */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

        {/* Contenido principal centrado */}
        <View style={styles.questionContainer}>
          <View style={styles.returningPhoneContainer}>
            <Text style={styles.returningPhoneText}>
              Pasa el celular al jugador que está leyendo las preguntas
            </Text>
          </View>
        </View>

        {/* Botones de acción */}
        <View style={styles.buttonsContainerRight}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueFromReturning}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (preferenceVoteState.phase === 'results') {
    const { option1Count, option2Count } = calculateResults();

    return (
      <>
        {/* Instrucción de la dinámica */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

        {/* Contenido principal centrado */}
        <View style={styles.questionContainer}>
          <View style={styles.resultsContentContainer}>
            <Text style={styles.resultsTitle}>Resultados</Text>

            <View style={styles.resultsContainer}>
              <View style={styles.resultRow}>
                <View style={styles.resultOptionContainer}>
                  <Text style={styles.resultOptionText}>{question.option1}</Text>
                </View>
                <View style={styles.resultVotesContainer}>
                  <Text style={styles.resultVotesText}>{option1Count} votos</Text>
                </View>
              </View>

              <View style={styles.resultRow}>
                <View style={styles.resultOptionContainer}>
                  <Text style={styles.resultOptionText}>{question.option2}</Text>
                </View>
                <View style={styles.resultVotesContainer}>
                  <Text style={styles.resultVotesText}>{option2Count} votos</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Botones de acción */}
        <View style={styles.buttonsContainerRight}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueFromResults}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (preferenceVoteState.phase === 'penalty') {
    const { losers } = calculateResults();

    return (
      <>
        {/* Instrucción de la dinámica */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

        {/* Contenido principal centrado */}
        <View style={styles.questionContainer}>
          {losers.length > 0 ? (
            <View style={styles.penaltyContainer}>
              <Text style={styles.penaltyText}>
                {losers.join(', ')}
              </Text>
              <Text style={styles.penaltyAction}>
                {losers.length === 1 ? 'toma' : 'toman'} un shot por votar por la
                opción menos votada
              </Text>
            </View>
          ) : (
            <View style={styles.penaltyContainer}>
              <Text style={styles.penaltyText}>¡Empate!</Text>
              <Text style={styles.penaltyAction}>Nadie toma</Text>
            </View>
          )}
        </View>

        {/* Botones de acción */}
        <View style={styles.buttonsContainerRight}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueFromPenalty}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return null;
};

const isSmallScreen = isSmallDevice();
const isShortHeight = isShortHeightDevice();

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

  instructionContainerVoting: {
    alignItems: 'center',
    marginBottom: scaleByContent(25, 'spacing'),
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
    maxHeight: isShortHeight ? scaleByContent(200, 'interactive') : isSmallScreen ? scaleByContent(300, 'interactive') : scaleByContent(400, 'interactive'),
    justifyContent: 'center',
    alignItems: 'center',
  },

  questionContainerVoting: {
    flex: 1,
    marginTop: scaleByContent(10, 'spacing'),
    marginBottom: scaleByContent(20, 'spacing'),
    maxHeight: isShortHeight ? scaleByContent(200, 'interactive') : isSmallScreen ? scaleByContent(300, 'interactive') : scaleByContent(400, 'interactive'),
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  passingPhoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleByContent(30, 'spacing'),
    paddingHorizontal: scaleByContent(25, 'spacing'),
  },

  votingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleByContent(25, 'spacing'),
    width: '100%',
  },

  passingPhoneText: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
    marginVertical: scaleByContent(5, 'spacing'),
  },

  playerNameHighlight: {
    fontSize: scaleByContent(28, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textDecorationLine: 'underline',
  },

  questionTitle: {
    fontSize: scaleByContent(22, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
    marginTop: scaleByContent(10, 'spacing'),
  },

  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: scaleByContent(10, 'spacing'),
    gap: scaleByContent(15, 'spacing'),
  },

  optionButton: {
    flex: 1,
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 15,
    paddingVertical: scaleByContent(20, 'interactive'),
    paddingHorizontal: scaleByContent(15, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    minHeight: scaleByContent(80, 'interactive'),
    justifyContent: 'center',
    alignItems: 'center',
  },

  optionButtonLeft: {
    transform: [{ rotate: '-2deg' }],
  },

  optionButtonRight: {
    transform: [{ rotate: '2deg' }],
  },

  optionButtonSelected: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 4,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.35,
    elevation: 8,
  },

  optionButtonText: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  questionEmoji: {
    fontSize: scaleByContent(35, 'icon'),
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
  },

  instructionAction: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: scaleByContent(10, 'spacing'),
  },

  returningPhoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleByContent(20, 'spacing'),
  },

  returningPhoneText: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
  },

  resultsContentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleByContent(25, 'spacing'),
    width: '100%',
  },

  resultsTitle: {
    fontSize: scaleByContent(28, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(30, 'spacing'),
  },

  resultsContainer: {
    width: '100%',
  },

  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleByContent(25, 'spacing'),
    paddingHorizontal: scaleByContent(15, 'spacing'),
    width: '100%',
  },

  resultOptionContainer: {
    flex: 2,
    marginRight: scaleByContent(15, 'spacing'),
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: scaleByContent(12, 'spacing'),
    paddingHorizontal: scaleByContent(15, 'spacing'),
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  resultOptionText: {
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  resultVotesContainer: {
    flex: 1,
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: scaleByContent(12, 'spacing'),
    paddingHorizontal: scaleByContent(15, 'spacing'),
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  resultVotesText: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  penaltyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleByContent(20, 'spacing'),
  },

  penaltyText: {
    fontSize: scaleByContent(26, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
  },

  penaltyAction: {
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    textAlign: 'center',
  },

  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: scaleByContent(20, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
  },

  buttonsContainerRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: scaleByContent(20, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
  },

  skipButton: {
    backgroundColor: theme.colors.postItPink,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: scaleByContent(8, 'spacing'),
    borderTopLeftRadius: scaleByContent(3, 'spacing'),
    paddingVertical: scaleByContent(6, 'spacing'),
    paddingHorizontal: scaleByContent(18, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
    transform: [{ rotate: '-2deg' }],
    opacity: 0.75,
  },

  skipButtonText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
  },

  skipPlayerButton: {
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: scaleByContent(8, 'spacing'),
    borderTopLeftRadius: scaleByContent(3, 'spacing'),
    paddingVertical: scaleByContent(6, 'spacing'),
    paddingHorizontal: scaleByContent(18, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
    transform: [{ rotate: '1deg' }],
    opacity: 0.75,
  },

  skipPlayerButtonText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
  },

  continueButton: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    borderRadius: scaleByContent(8, 'spacing'),
    borderTopLeftRadius: scaleByContent(3, 'spacing'),
    paddingVertical: scaleByContent(6, 'spacing'),
    paddingHorizontal: scaleByContent(22, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(4, 'spacing'), height: scaleByContent(4, 'spacing') },
    shadowOpacity: 0.35,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 6,
    transform: [{ rotate: '2deg' }],
  },

  continueButtonText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  confirmButtonDisabled: {
    backgroundColor: '#D0D0D0',
    opacity: 0.6,
  },

  confirmButtonTextDisabled: {
    color: '#808080',
  },
});

export default PreferenceVoteDisplay;
