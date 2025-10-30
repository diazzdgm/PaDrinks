import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import { scaleByContent, isSmallDevice } from '../../utils/responsive';
import {
  initializeAnonymousVote,
  setAnonymousVotePhase,
  recordAnonymousVote,
  nextAnonymousVotePlayer,
  skipAnonymousVotePlayer,
  resetAnonymousVoteState,
} from '../../store/gameSlice';
import { getGameEngine } from '../../game/GameEngine';
import audioService from '../../services/AudioService';

const AnonymousVoteDisplay = ({
  question,
  allGamePlayers,
  onComplete,
  onSkipDynamic,
}) => {
  const dispatch = useDispatch();
  const gameEngine = getGameEngine();
  const isSmallScreen = isSmallDevice();

  const { anonymousVoteState } = useSelector((state) => state.game);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!anonymousVoteState.phase && question) {
      const eligibleVoters = gameEngine.filterPlayersByGender(
        question.genderRestriction
      );

      let eligibleTargets = allGamePlayers;
      if (question.targetGender) {
        eligibleTargets = allGamePlayers.filter(
          (p) => p.gender === question.targetGender
        );
      }

      if (eligibleVoters.length < 1 || eligibleTargets.length < 2) {
        onSkipDynamic();
        return;
      }

      dispatch(
        initializeAnonymousVote({
          eligiblePlayers: eligibleVoters,
          targetPlayers: eligibleTargets,
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
    dispatch(setAnonymousVotePhase('voting'));
    setSelectedPlayer(null);
  };

  const handleSkipPlayer = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    playWinePopSound();

    const newIndex = anonymousVoteState.currentPlayerIndex + 1;

    if (
      anonymousVoteState.playerVotes.length === 0 &&
      newIndex >= anonymousVoteState.eligiblePlayers.length - 1
    ) {
      dispatch(resetAnonymousVoteState());
      onSkipDynamic();
      return;
    }

    dispatch(nextAnonymousVotePlayer());

    if (newIndex >= anonymousVoteState.eligiblePlayers.length) {
      dispatch(setAnonymousVotePhase('returning_phone'));
    } else {
      dispatch(setAnonymousVotePhase('passing_phone'));
    }
  };

  const handlePlayerSelect = (player) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    playWinePopSound();
    setSelectedPlayer(player);

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
    if (!selectedPlayer) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {}

    playBeerSound();

    const currentPlayer =
      anonymousVoteState.eligiblePlayers[
        anonymousVoteState.currentPlayerIndex
      ];

    dispatch(
      recordAnonymousVote({
        voterId: currentPlayer.id,
        voterName: currentPlayer.name || currentPlayer.nickname,
        votedForId: selectedPlayer.id,
        votedForName: selectedPlayer.name || selectedPlayer.nickname,
      })
    );

    dispatch(nextAnonymousVotePlayer());
    setSelectedPlayer(null);

    const newIndex = anonymousVoteState.currentPlayerIndex + 1;

    if (newIndex >= anonymousVoteState.eligiblePlayers.length) {
      dispatch(setAnonymousVotePhase('returning_phone'));
    } else {
      dispatch(setAnonymousVotePhase('passing_phone'));
    }
  };

  const handleContinueFromReturning = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    playBeerSound();
    dispatch(setAnonymousVotePhase('results'));
  };

  const handleContinueFromResults = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {}

    playBeerSound();
    dispatch(setAnonymousVotePhase('penalty'));
  };

  const handleContinueFromPenalty = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {}

    playBeerSound();
    dispatch(resetAnonymousVoteState());
    onComplete();
  };

  const calculateResults = () => {
    const voteCounts = {};
    anonymousVoteState.targetPlayers.forEach((player) => {
      voteCounts[player.id] = {
        name: player.name || player.nickname,
        count: 0,
      };
    });

    anonymousVoteState.playerVotes.forEach((vote) => {
      if (voteCounts[vote.votedForId]) {
        voteCounts[vote.votedForId].count++;
      }
    });

    const resultsArray = Object.entries(voteCounts).map(([id, data]) => ({
      playerId: id,
      playerName: data.name,
      votes: data.count,
    }));

    resultsArray.sort((a, b) => b.votes - a.votes);

    const maxVotes = resultsArray[0]?.votes || 0;
    const winners = resultsArray.filter((r) => r.votes === maxVotes && maxVotes > 0);

    return {
      results: resultsArray,
      winners,
    };
  };

  if (!anonymousVoteState.phase || !question) {
    return null;
  }

  if (anonymousVoteState.phase === 'passing_phone') {
    const currentPlayer =
      anonymousVoteState.eligiblePlayers[
        anonymousVoteState.currentPlayerIndex
      ];
    const playerName = currentPlayer?.name || currentPlayer?.nickname || 'Jugador';

    return (
      <>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

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

  if (anonymousVoteState.phase === 'voting') {
    const currentPlayer =
      anonymousVoteState.eligiblePlayers[
        anonymousVoteState.currentPlayerIndex
      ];
    const playerName = currentPlayer?.name || currentPlayer?.nickname || 'Jugador';
    const targetPlayers = anonymousVoteState.targetPlayers;
    const numPlayers = targetPlayers.length;
    const numColumns = numPlayers <= 6 ? 3 : numPlayers <= 12 ? 4 : 5;

    return (
      <>
        <View style={styles.instructionContainerVoting}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

        <View style={styles.questionContainerVoting}>
          <Text style={styles.questionTitle}>
            {playerName}, {question.text}
          </Text>

          <View style={styles.playersGridCompact}>
            {targetPlayers.map((player, index) => {
              const isSelected = selectedPlayer?.id === player.id;
              const displayName = player.name || player.nickname;

              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.playerButtonCompact,
                    numColumns === 3 && styles.playerButtonThreeColumnCompact,
                    numColumns === 4 && styles.playerButtonFourColumnCompact,
                    numColumns === 5 && styles.playerButtonFiveColumnCompact,
                    isSelected && styles.playerButtonSelectedCompact,
                    { transform: [{ rotate: `${(index % 3 - 1) * 1}deg` }] },
                  ]}
                  onPress={() => handlePlayerSelect(player)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.playerButtonTextCompact}>
                    {displayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.questionEmojiCompact}>{question.emoji}</Text>
          <Text style={styles.instructionActionCompact}>{question.instruction}</Text>
        </View>

        <View style={styles.buttonsContainerRight}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedPlayer && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirmVote}
            activeOpacity={selectedPlayer ? 0.8 : 1}
            disabled={!selectedPlayer}
          >
            <Text style={[
              styles.continueButtonText,
              !selectedPlayer && styles.confirmButtonTextDisabled
            ]}>
              Continuar
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (anonymousVoteState.phase === 'returning_phone') {
    return (
      <>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <View style={styles.returningPhoneContainer}>
            <Text style={styles.returningPhoneText}>
              Pasa el celular a la persona que está leyendo las dinámicas
            </Text>
          </View>
        </View>

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

  if (anonymousVoteState.phase === 'results') {
    const { results } = calculateResults();

    return (
      <>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.resultsContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.resultsTitle}>Resultados</Text>

            <View style={styles.resultsContainer}>
              {results.map((result, index) => (
                <View key={result.playerId} style={styles.resultRow}>
                  <View style={styles.resultPlayerContainer}>
                    <Text style={styles.resultPlayerText}>{result.playerName}</Text>
                  </View>
                  <View style={styles.resultVotesContainer}>
                    <Text style={styles.resultVotesText}>
                      {result.votes} {result.votes === 1 ? 'voto' : 'votos'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

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

  if (anonymousVoteState.phase === 'penalty') {
    const { winners } = calculateResults();

    return (
      <>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {question.dynamicInstruction}
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <View style={styles.penaltyContainer}>
            {winners.length > 0 ? (
              <>
                <Text style={styles.penaltyText}>
                  {winners.map(w => w.playerName).join(', ')}
                </Text>
                <Text style={styles.penaltyAction}>
                  {winners.length === 1 ? 'toma' : 'toman'} shot por ser {winners.length === 1 ? 'el más votado' : 'los más votados'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.penaltyText}>¡No hubo votos!</Text>
                <Text style={styles.penaltyAction}>Nadie toma</Text>
              </>
            )}
          </View>
        </View>

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
    marginBottom: scaleByContent(20, 'spacing'),
    backgroundColor: theme.colors.postItPink,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 20,
    borderTopLeftRadius: 5,
    paddingVertical: scaleByContent(12, 'spacing'),
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

  questionContainerVoting: {
    flex: 1,
    marginTop: scaleByContent(5, 'spacing'),
    marginBottom: scaleByContent(10, 'spacing'),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(15, 'spacing'),
  },

  scrollView: {
    flex: 1,
    width: '100%',
  },

  votingContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: scaleByContent(20, 'spacing'),
    paddingBottom: scaleByContent(20, 'spacing'),
  },

  passingPhoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleByContent(30, 'spacing'),
    paddingHorizontal: scaleByContent(25, 'spacing'),
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
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: scaleByContent(12, 'spacing'),
    marginTop: scaleByContent(8, 'spacing'),
  },

  playersGrid: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: scaleByContent(15, 'spacing'),
    gap: scaleByContent(8, 'spacing'),
  },

  playerButton: {
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: scaleByContent(12, 'interactive'),
    paddingHorizontal: scaleByContent(10, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: scaleByContent(45, 'interactive'),
  },

  playerButtonTwoColumn: {
    width: '48%',
  },

  playerButtonThreeColumn: {
    width: '31%',
  },

  playerButtonFourColumn: {
    width: '23%',
  },

  playerButtonSelected: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 3,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    elevation: 6,
  },

  playerButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  playerButtonTextSmall: {
    fontSize: scaleByContent(14, 'text'),
  },

  playersGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: scaleByContent(12, 'spacing'),
    gap: 8,
  },

  playerButtonCompact: {
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },

  playerButtonThreeColumnCompact: {
    flexShrink: 1,
    flexGrow: 0,
  },

  playerButtonFourColumnCompact: {
    flexShrink: 1,
    flexGrow: 0,
  },

  playerButtonFiveColumnCompact: {
    flexShrink: 1,
    flexGrow: 0,
  },

  playerButtonSelectedCompact: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 2,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    elevation: 4,
  },

  playerButtonTextCompact: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  questionEmojiCompact: {
    fontSize: scaleByContent(38, 'icon'),
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
    marginTop: scaleByContent(12, 'spacing'),
  },

  instructionActionCompact: {
    fontSize: scaleByContent(17, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: scaleByContent(10, 'spacing'),
  },

  questionEmoji: {
    fontSize: scaleByContent(35, 'icon'),
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
    marginTop: scaleByContent(10, 'spacing'),
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
    justifyContent: 'flex-start',
    paddingHorizontal: scaleByContent(25, 'spacing'),
    paddingBottom: scaleByContent(20, 'spacing'),
  },

  resultsTitle: {
    fontSize: scaleByContent(28, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(25, 'spacing'),
  },

  resultsContainer: {
    width: '100%',
  },

  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleByContent(18, 'spacing'),
    paddingHorizontal: scaleByContent(10, 'spacing'),
    width: '100%',
  },

  resultPlayerContainer: {
    flex: 2,
    marginRight: scaleByContent(12, 'spacing'),
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: scaleByContent(10, 'spacing'),
    paddingHorizontal: scaleByContent(12, 'spacing'),
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  resultPlayerText: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  resultVotesContainer: {
    flex: 1,
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: scaleByContent(10, 'spacing'),
    paddingHorizontal: scaleByContent(10, 'spacing'),
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  resultVotesText: {
    fontSize: scaleByContent(16, 'text'),
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
    borderRadius: 8,
    borderTopLeftRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 18,
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
    borderRadius: 8,
    borderTopLeftRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 18,
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
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 8,
    borderTopLeftRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 22,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
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

export default AnonymousVoteDisplay;
