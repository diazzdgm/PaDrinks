import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import {
  scale,
  scaleWidth,
  scaleHeight,
  scaleText,
  scaleModerate,
  scaleByContent,
  getDeviceType,
  isSmallDevice,
  isTablet,
  RESPONSIVE,
  getDeviceInfo
} from '../../utils/responsive';
import { getGameEngine } from '../../game/GameEngine';
import {
  startGame,
  nextRound,
  setCurrentQuestion,
  updateGameEngineState,
  pauseGame,
  resumeGame,
  setConfigModalOpen,
  extendGame,
  endGame,
} from '../../store/gameSlice';
import GameConfigModal from '../../components/game/GameConfigModal';

const CustomMuteIcon = ({ size, isMuted = false }) => {
  const responsiveSize = size || scaleModerate(50, 0.3);

  return (
    <View style={styles.customIconContainer}>
      <Image
        source={require('../../../assets/images/Megaphone.MUTE.png')}
        style={[
          styles.megaphoneImage,
          {
            width: responsiveSize,
            height: responsiveSize,
            opacity: isMuted ? 0.6 : 1,
          }
        ]}
        resizeMode="contain"
      />

      {isMuted && (
        <View style={styles.mutedIndicator}>
          <View style={[styles.mutedLine, { backgroundColor: '#FF0000' }]} />
          <View style={[styles.mutedLine, { backgroundColor: '#FF0000', transform: [{ rotate: '90deg' }] }]} />
        </View>
      )}
    </View>
  );
};

const CustomConfigIcon = ({ size }) => {
  const responsiveSize = size || scaleModerate(50, 0.3);

  return (
    <View style={styles.customIconContainer}>
      <Image
        source={require('../../../assets/images/Engranaje.CONFIG.png')}
        style={[
          styles.configImage,
          {
            width: responsiveSize,
            height: responsiveSize,
          }
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const GameScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const gameEngine = getGameEngine();

  // Parámetros de navegación
  const { registeredPlayers = [] } = route.params || {};

  // Redux state
  const {
    currentQuestion,
    currentRound,
    totalRounds,
    gamePhase,
    isConfigModalOpen,
    questionsRemaining
  } = useSelector(state => state.game);

  const { playersList } = useSelector(state => state.players);

  // Local state
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const [gameEnded, setGameEnded] = useState(false);
  const [canExtend, setCanExtend] = useState(false);

  // Estado local para manejar TODOS los jugadores (iniciales + agregados)
  const [allGamePlayers, setAllGamePlayers] = useState(() => {
    // Inicializar con jugadores registrados
    console.log('🎯 Inicializando allGamePlayers con:', registeredPlayers);
    return [...registeredPlayers];
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const instructionAnim = useRef(new Animated.Value(-30)).current;
  const questionAnim = useRef(new Animated.Value(30)).current;
  const buttonsAnim = useRef(new Animated.Value(50)).current;
  const muteButtonScale = useRef(new Animated.Value(1)).current;
  const configButtonScale = useRef(new Animated.Value(1)).current;

  // Sincronizar allGamePlayers cuando se agreguen jugadores dinámicamente
  useEffect(() => {
    setAllGamePlayers(prev => {
      console.log('🔄 Sincronizando jugadores...');
      console.log('🔄 Jugadores previos:', prev.map(p => ({ id: p.id, name: p.name || p.nickname })));
      console.log('🔄 Jugadores de Redux:', playersList.map(p => ({ id: p.id, name: p.name })));

      // Crear un Set con los IDs existentes para evitar duplicados
      const existingIds = new Set(prev.map(p => p.id));
      const newPlayers = playersList.filter(p => !existingIds.has(p.id));

      if (newPlayers.length > 0) {
        const updated = [...prev, ...newPlayers];
        console.log('🔄 Agregando nuevos jugadores:', newPlayers.map(p => p.name));
        console.log('🔄 Lista actualizada:', updated.map(p => ({ id: p.id, name: p.name || p.nickname })));
        return updated;
      }
      console.log('🔄 No hay nuevos jugadores que agregar');
      return prev;
    });
  }, [playersList.length]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 useFocusEffect ejecutado, allGamePlayers actual:', allGamePlayers.length);
      console.log('🎯 route.params:', route.params);

      setIsMuted(audioService.isMusicMuted);

      // Inicializar el juego si viene de SingleDeviceSetup pero NO si regresa de agregar jugador
      if (route.params?.gameMode === 'single-device' && route.params?.playerCount && !route.params?.isReturningFromAddPlayer) {
        initializeGame();
      }

      startEntranceAnimations();

      return () => {
        // audioService gestiona automáticamente la limpieza
      };
    }, [route.params])
  );

  const initializeGame = async () => {
    try {
      console.log('🎮 Inicializando juego con jugadores:', allGamePlayers);
      const result = gameEngine.startGame(allGamePlayers, {
        maxRounds: 50,
        gameMode: 'single-device'
      });

      if (result.success) {
        dispatch(startGame({
          gameEngineState: result.gameState,
          question: result.question
        }));
      }
    } catch (error) {
      console.error('Error initializing game:', error);
    }
  };

  const startEntranceAnimations = () => {
    fadeAnim.setValue(0);
    instructionAnim.setValue(-30);
    questionAnim.setValue(30);
    buttonsAnim.setValue(50);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(instructionAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 200);

    setTimeout(() => {
      Animated.timing(questionAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 400);

    setTimeout(() => {
      Animated.timing(buttonsAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 600);
  };

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

  const handleContinue = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playBeerSound();

    const result = gameEngine.nextRound();

    if (result.success) {
      if (result.gameEnded) {
        setGameEnded(true);
        setCanExtend(result.canExtend || false);
        if (result.gameStats) {
          dispatch(endGame({ gameStats: result.gameStats }));
        }
      } else {
        dispatch(nextRound({
          gameEngineState: result.gameState,
          question: result.question
        }));
      }
    }
  };

  const handleSkipDynamic = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playWinePopSound();

    const result = gameEngine.skipDynamic();

    if (result.success) {
      if (result.gameEnded) {
        setGameEnded(true);
        setCanExtend(result.canExtend || false);
        if (result.gameStats) {
          dispatch(endGame({ gameStats: result.gameStats }));
        }
      } else {
        dispatch(setCurrentQuestion(result.question));
        dispatch(updateGameEngineState(result.gameState));
      }
    }
  };

  const toggleMute = async () => {
    playWinePopSound();

    try {
      const newMuteState = await audioService.toggleMute();
      setIsMuted(newMuteState);

      Animated.sequence([
        Animated.timing(muteButtonScale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(muteButtonScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

    } catch (error) {
      console.log('Error toggling mute:', error);
    }
  };

  const handleConfigPress = async () => {
    playWinePopSound();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    Animated.sequence([
      Animated.timing(configButtonScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(configButtonScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    dispatch(setConfigModalOpen(true));
  };

  const handleExtendGame = () => {
    const result = gameEngine.extendGame(25);
    if (result.success) {
      dispatch(extendGame({
        newTotalRounds: result.newTotalRounds,
        gameEngineState: result.gameState
      }));
      setGameEnded(false);
      setCanExtend(false);
    }
  };

  const handleEndGame = () => {
    navigation.navigate('MainMenu');
  };

  // Obtener información del dispositivo para estilos dinámicos
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const isSmallScreen = isSmallDevice();
  const isTabletScreen = isTablet();

  // Ajustar tamaño de fuente para preguntas largas
  const getQuestionFontSize = (text) => {
    if (!text) return scaleByContent(28, 'text');

    if (text.length > 80) return scaleByContent(isSmallScreen ? 22 : 24, 'text');
    if (text.length > 60) return scaleByContent(isSmallScreen ? 24 : 26, 'text');
    return scaleByContent(isSmallScreen ? 26 : 28, 'text');
  };

  if (gameEnded) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Fondo de papel */}
        <View style={styles.paperBackground}>
          <View style={styles.notebookLines}>
            {[...Array(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 45 : 20)].map((_, index) => (
              <View
                key={index}
                style={[styles.line, { top: (Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 20 : 40) + (index * (Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 18 : 25)) }]}
              />
            ))}
          </View>
          <View style={styles.redMarginLine} />
          <View style={styles.holesPunch}>
            {[...Array(8)].map((_, index) => (
              <View key={index} style={styles.hole} />
            ))}
          </View>
        </View>

        {/* Contenido de fin de juego */}
        <View style={styles.gameEndContainer}>
          <Text style={styles.gameEndTitle}>¡JUEGO TERMINADO!</Text>
          <Text style={styles.gameEndSubtitle}>Has completado {currentRound - 1} rondas</Text>

          {canExtend && (
            <TouchableOpacity
              style={styles.extendButton}
              onPress={handleExtendGame}
              activeOpacity={0.8}
            >
              <Text style={styles.extendButtonText}>Continuar 25 rondas más</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.endGameButton}
            onPress={handleEndGame}
            activeOpacity={0.8}
          >
            <Text style={styles.endGameButtonText}>Terminar Juego</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Fondo de papel con líneas */}
      <View style={styles.paperBackground}>
        <View style={styles.notebookLines}>
          {[...Array(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 45 : 20)].map((_, index) => (
            <View
              key={index}
              style={[styles.line, { top: (Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 20 : 40) + (index * (Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 18 : 25)) }]}
            />
          ))}
        </View>
        <View style={styles.redMarginLine} />
        <View style={styles.holesPunch}>
          {[...Array(8)].map((_, index) => (
            <View key={index} style={styles.hole} />
          ))}
        </View>
      </View>

      {/* Botón de Mute */}
      <Animated.View
        style={[
          styles.muteButton,
          {
            transform: [{ scale: muteButtonScale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={toggleMute}
          style={styles.iconButtonTouchable}
          activeOpacity={0.8}
        >
          <CustomMuteIcon
            size={50}
            isMuted={isMuted}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Botón de Configuración */}
      <Animated.View
        style={[
          styles.configButton,
          {
            transform: [{ scale: configButtonScale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleConfigPress}
          style={styles.iconButtonTouchable}
          activeOpacity={0.8}
        >
          <CustomConfigIcon size={50} />
        </TouchableOpacity>
      </Animated.View>

      {/* Indicador de ronda */}
      <View style={styles.roundIndicator}>
        <Text style={styles.roundText}>Ronda {currentRound} de {totalRounds}</Text>
      </View>

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Instrucción de la dinámica */}
        {currentQuestion?.dynamicInstruction && (
          <Animated.View
            style={[
              styles.instructionContainer,
              { transform: [{ translateY: instructionAnim }] }
            ]}
          >
            <Text style={styles.instructionText}>
              {currentQuestion.dynamicInstruction}
            </Text>
          </Animated.View>
        )}

        {/* Pregunta principal */}
        <Animated.View
          style={[
            styles.questionContainer,
            { transform: [{ translateY: questionAnim }] }
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.questionScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[
              styles.questionText,
              { fontSize: getQuestionFontSize(currentQuestion?.text) }
            ]}>
              {currentQuestion?.text}
            </Text>

            <Text style={styles.questionEmoji}>
              {currentQuestion?.emoji}
            </Text>

            <Text style={styles.instructionAction}>
              {currentQuestion?.instruction}
            </Text>
          </ScrollView>
        </Animated.View>

        {/* Botones de acción */}
        <Animated.View
          style={[
            styles.buttonsContainer,
            { transform: [{ translateY: buttonsAnim }] }
          ]}
        >
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipDynamic}
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
        </Animated.View>
      </View>

      {/* Modal de configuración */}
      <GameConfigModal
        visible={isConfigModalOpen}
        onClose={() => dispatch(setConfigModalOpen(false))}
        navigation={navigation}
        allGamePlayers={allGamePlayers}
        onPlayerRemoved={(playerId) => {
          // Callback específico para remover jugador
          console.log('🚫 Removiendo jugador con ID:', playerId, 'tipo:', typeof playerId);
          setAllGamePlayers(prev => {
            // Convertir ambos IDs a string para comparación consistente
            const filtered = prev.filter(p => String(p.id) !== String(playerId));
            console.log('🚫 Jugadores antes de remover:', prev.map(p => ({ id: p.id, idType: typeof p.id, name: p.name || p.nickname })));
            console.log('🚫 Jugadores después de remover:', filtered.map(p => ({ id: p.id, idType: typeof p.id, name: p.name || p.nickname })));
            return filtered;
          });
        }}
      />
    </Animated.View>
  );
};

// Obtener información del dispositivo para estilos dinámicos
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F0',
  },

  // Fondo de papel
  paperBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F6F0',
  },

  notebookLines: {
    position: 'absolute',
    top: 0,
    left: 100,
    right: 20,
    bottom: 0,
  },

  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.6,
  },

  redMarginLine: {
    position: 'absolute',
    left: 95,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.5,
  },

  holesPunch: {
    position: 'absolute',
    left: 30,
    top: 60,
    bottom: 60,
    width: 25,
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  hole: {
    width: 18,
    height: 18,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D0D0D0',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // Botones superiores
  muteButton: {
    position: 'absolute',
    top: 30,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    transform: [{ rotate: '2deg' }],
    zIndex: 15,
  },

  configButton: {
    position: 'absolute',
    top: 30,
    right: 90,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    transform: [{ rotate: '-2deg' }],
    zIndex: 15,
  },

  iconButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  customIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    transform: [{ rotate: '-1.5deg' }],
  },

  configImage: {},

  megaphoneImage: {},

  mutedIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mutedLine: {
    width: '80%',
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },

  // Indicador de ronda
  roundIndicator: {
    position: 'absolute',
    top: 30,
    left: 30,
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 15,
    borderTopLeftRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
    zIndex: 10,
  },

  roundText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },

  // Contenido principal
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(120, 'spacing'),
    paddingTop: scaleByContent(60, 'spacing'),
    paddingBottom: scaleByContent(20, 'spacing'),
  },

  // Instrucción
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

  // Pregunta principal
  questionContainer: {
    flex: 1,
    marginVertical: scaleByContent(20, 'spacing'),
    maxHeight: isSmallScreen ? 300 : 400,
    justifyContent: 'center',
    alignItems: 'center',
  },

  questionScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scaleByContent(30, 'spacing'),
    paddingHorizontal: scaleByContent(25, 'spacing'),
  },

  questionText: {
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
  },

  questionEmoji: {
    fontSize: scaleByContent(40, 'icon'),
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
  },

  instructionAction: {
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
  },

  // Botones de acción
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

  // Pantalla de fin de juego
  gameEndContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(40, 'spacing'),
  },

  gameEndTitle: {
    fontSize: scaleByContent(32, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(20, 'spacing'),
    transform: [{ rotate: '1deg' }],
  },

  gameEndSubtitle: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(40, 'spacing'),
    transform: [{ rotate: '-0.5deg' }],
  },

  extendButton: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 20,
    borderTopLeftRadius: 5,
    paddingVertical: scaleByContent(15, 'interactive'),
    paddingHorizontal: scaleByContent(30, 'interactive'),
    marginBottom: scaleByContent(20, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '2deg' }],
  },

  extendButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  endGameButton: {
    backgroundColor: theme.colors.postItPink,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 20,
    borderTopLeftRadius: 5,
    paddingVertical: scaleByContent(15, 'interactive'),
    paddingHorizontal: scaleByContent(30, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '-2deg' }],
  },

  endGameButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
});

export default GameScreen;