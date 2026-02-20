import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import { useSafeAreaOffsets } from '../../hooks/useSafeAreaOffsets';
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
  isShortHeightDevice,
  getScreenHeight,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
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
  setMentionChallengePlayer,
  addPairedChallengeParticipants,
  removePairedChallengeParticipant,
  resetPairedChallengeParticipants,
  resetPairedChallengeForDynamic,
  resetGame,
} from '../../store/gameSlice';
import { clearAllPlayers } from '../../store/playersSlice';
import GameConfigModal from '../../components/game/GameConfigModal';
import PreferenceVoteDisplay from '../../components/game/PreferenceVoteDisplay';
import AnonymousVoteDisplay from '../../components/game/AnonymousVoteDisplay';
import CharadesDisplay from '../../components/game/CharadesDisplay';
import PrizeRouletteDisplay from '../../components/game/PrizeRouletteDisplay';
import SpinBottleDisplay from '../../components/game/SpinBottleDisplay';

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
    questionsRemaining,
    mentionChallengeTracking,
    pairedChallengeTracking
  } = useSelector(state => state.game);

  const { playersList } = useSelector(state => state.players);

  // Safe area offsets para iOS
  const { rightOffset, topOffset } = useSafeAreaOffsets();

  // Local state
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const [gameEnded, setGameEnded] = useState(false);
  const [canExtend, setCanExtend] = useState(false);
  const [selectedPlayerForQuestion, setSelectedPlayerForQuestion] = useState(null);
  const [selectedPairedPlayers, setSelectedPairedPlayers] = useState({ player1: null, player2: null });

  // Estado local para manejar TODOS los jugadores (iniciales + agregados)
  const [allGamePlayers, setAllGamePlayers] = useState(() => {
    // Inicializar con jugadores registrados
    console.log('🎯 Inicializando allGamePlayers con:', registeredPlayers);
    return [...registeredPlayers];
  });

  // Ref para controlar si el componente está montado (DEBE IR PRIMERO)
  const isMountedRef = useRef(true);

  // Ref para prevenir re-procesamiento de dinámicas que ya fueron saltadas porque todos participaron
  const skippedPairedDynamicIds = useRef(new Set());

  // Ref para rastrear el ID de la última pregunta procesada (prevenir loop infinito)
  const lastProcessedQuestionId = useRef(null);

  // Ref para rastrear si el juego ya fue inicializado (evita sincronización prematura con Redux)
  const gameInitialized = useRef(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const instructionAnim = useRef(new Animated.Value(-30)).current;
  const questionAnim = useRef(new Animated.Value(30)).current;
  const buttonsAnim = useRef(new Animated.Value(50)).current;
  const muteButtonScale = useRef(new Animated.Value(1)).current;
  const configButtonScale = useRef(new Animated.Value(1)).current;

  // Resetear allGamePlayers cuando cambian los registeredPlayers de route params (nueva partida)
  useEffect(() => {
    // NO resetear si el juego está en curso (usar Redux en lugar de ref que se resetea al remontar)
    if (gamePhase === 'playing' || gamePhase === 'paused') {
      console.log('🔄 ⏸️ Ignorando reseteo - juego en curso (fase:', gamePhase, ')');
      return;
    }

    // NO resetear cuando se está regresando de agregar jugador a media partida
    if (route.params?.isReturningFromAddPlayer) {
      console.log('🔄 ⏸️ Ignorando reseteo - regresando de agregar jugador');
      return;
    }

    if (registeredPlayers && registeredPlayers.length > 0 && route.params?.gameMode === 'single-device') {
      console.log('🔄 NUEVA PARTIDA - Reseteando allGamePlayers con nuevos registeredPlayers:', registeredPlayers);
      setAllGamePlayers([...registeredPlayers]);
      // Resetear flag de inicialización para permitir nueva inicialización
      gameInitialized.current = false;
    }
  }, [route.params?.gameMode, route.params?.playerCount, gamePhase]);

  // Sincronizar allGamePlayers cuando se agreguen jugadores dinámicamente SOLO después de inicializar
  useEffect(() => {
    // NO ejecutar si el componente no está montado
    if (!isMountedRef.current) {
      console.log('🔄 ⏸️ Sincronización cancelada - componente desmontado');
      return;
    }

    // SOLO sincronizar si el juego ya fue inicializado (usar Redux en lugar de ref que se resetea al remontar)
    if (gamePhase !== 'playing' && gamePhase !== 'paused') {
      console.log('🔄 ⏸️ Sincronización pausada - juego no iniciado (fase:', gamePhase, ')');
      return;
    }

    // Si Redux está vacío, significa que el juego terminó y se limpió - NO sincronizar
    if (playersList.length === 0) {
      console.log('🔄 ⏸️ Redux vacío - juego terminó o no hay jugadores');
      return;
    }

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

        // NO resetear el sistema de rotación - mantener el estado actual
        // Los nuevos jugadores automáticamente estarán disponibles ya que no están en el tracking de cada dinámica
        console.log('🔄 Nuevos jugadores agregados - manteniendo estado de rotación mention_challenge');

        return updated;
      }
      console.log('🔄 No hay nuevos jugadores que agregar');
      return prev;
    });
  }, [playersList.length, gamePhase]);

  // Cleanup cuando el componente se desmonta COMPLETAMENTE
  useEffect(() => {
    isMountedRef.current = true;
    console.log('🎮 GameScreen MONTADO');

    return () => {
      isMountedRef.current = false;
      console.log('🎮 GameScreen DESMONTADO - limpiando estado');

      // Limpiar todo el estado local
      setAllGamePlayers([]);
      setSelectedPlayerForQuestion(null);
      setSelectedPairedPlayers({ player1: null, player2: null });
      setGameEnded(false);
      setCanExtend(false);

      // Limpiar refs
      skippedPairedDynamicIds.current.clear();
      lastProcessedQuestionId.current = null;
      gameInitialized.current = false;

      console.log('🎮 Estado local limpiado en desmontaje');
    };
  }, []);

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

        // Marcar juego como inicializado para permitir sincronización con Redux
        gameInitialized.current = true;
        console.log('✅ Juego inicializado - sincronización con Redux activada');
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
    console.log('🧹 === INICIANDO LIMPIEZA COMPLETA DEL JUEGO ===');

    // 1. Limpiar currentQuestion PRIMERO para evitar que useEffect procese datos viejos
    dispatch(setCurrentQuestion(null));
    console.log('🧹 Pregunta actual limpiada');

    // 2. Limpiar estado local
    setAllGamePlayers([]);
    setSelectedPlayerForQuestion(null);
    setSelectedPairedPlayers({ player1: null, player2: null });
    setGameEnded(false);
    setCanExtend(false);
    console.log('🧹 Estado local de jugadores limpiado');

    // 3. Limpiar refs
    skippedPairedDynamicIds.current.clear();
    lastProcessedQuestionId.current = null;
    gameInitialized.current = false;
    console.log('🧹 Refs de dinámicas bloqueadas limpiadas');

    // 4. Resetear el GameEngine
    const gameEngine = getGameEngine();
    gameEngine.resetGame();
    console.log('🧹 GameEngine reseteado');

    // 5. Limpiar Redux AL FINAL
    dispatch(clearAllPlayers());
    dispatch(resetGame());
    console.log('🧹 Redux limpiado');

    console.log('🧹 === LIMPIEZA COMPLETA TERMINADA ===');

    // 6. RESETEAR el stack de navegación para desmontar completamente GameScreen
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainMenu' }],
    });
    console.log('🧹 Stack de navegación reseteado - GameScreen desmontado');
  };

  // Obtener información del dispositivo para estilos dinámicos
  const isSmallScreen = isSmallDevice();
  const isTabletScreen = isTablet();

  // Ajustar tamaño de fuente para preguntas largas
  const getQuestionFontSize = (text) => {
    if (!text) return scaleByContent(28, 'text');

    if (text.length > 80) return scaleByContent(isSmallScreen ? 22 : 24, 'text');
    if (text.length > 60) return scaleByContent(isSmallScreen ? 24 : 26, 'text');
    return scaleByContent(isSmallScreen ? 26 : 28, 'text');
  };

  // Efecto para seleccionar jugador aleatorio cuando cambia la pregunta (con rotación independiente por dinámica)
  useEffect(() => {
    // NO ejecutar si el componente no está montado
    if (!isMountedRef.current) {
      console.log('⏸️ mention_challenge useEffect cancelado - componente desmontado');
      return;
    }

    if (currentQuestion?.dynamicType === 'mention_challenge' && allGamePlayers.length > 0) {
      const dynamicId = currentQuestion.dynamicName || 'unknown';
      const tracking = mentionChallengeTracking[dynamicId] || { lastPlayer: null, usedPlayerIds: [] };
      const genderRestriction = currentQuestion.genderRestriction;

      console.log(`🎯 === NUEVA PREGUNTA: ${dynamicId} ===`);
      console.log(`🎯 Total jugadores: ${allGamePlayers.length}`);
      console.log(`🎯 Jugadores: ${allGamePlayers.map(p => p.name || p.nickname).join(', ')}`);
      console.log(`🎯 Restricción de género: ${genderRestriction || 'ninguna'}`);
      console.log(`🎯 Último jugador de esta dinámica: ${tracking.lastPlayer ? `${tracking.lastPlayer.name}(${tracking.lastPlayer.id})` : 'ninguno'}`);
      console.log(`🎯 IDs usados en esta dinámica: [${tracking.usedPlayerIds.join(', ')}]`);

      const usedPlayerIdsSet = new Set(tracking.usedPlayerIds);

      // Filtrar jugadores que no han sido usados en ESTA dinámica específica
      let availablePlayers = allGamePlayers.filter(player =>
        !usedPlayerIdsSet.has(player.id)
      );

      // Si hay restricción de género, filtrar por género
      if (genderRestriction) {
        const eligibleByGender = availablePlayers.filter(player => player.gender === genderRestriction);

        // Si no hay jugadores del género requerido, saltar la dinámica automáticamente
        if (eligibleByGender.length === 0) {
          console.log(`🎯 ⚠️ No hay jugadores del género "${genderRestriction}" disponibles - SALTAR PREGUNTA`);

          const skipResult = gameEngine.skipDynamic();
          if (skipResult.success) {
            dispatch(setCurrentQuestion(skipResult.question));
          }
          return;
        }

        availablePlayers = eligibleByGender;
        console.log(`🎯 Jugadores elegibles con género "${genderRestriction}": ${availablePlayers.length}`);
      }

      console.log(`🎯 Jugadores disponibles: ${availablePlayers.length}`);
      console.log(`🎯 Disponibles: ${availablePlayers.map(p => `${p.name || p.nickname}(${p.id})`).join(', ')}`);

      let selectedPlayer;
      let newUsedPlayerIds;

      if (availablePlayers.length > 0) {
        // Hay jugadores disponibles, seleccionar uno aleatorio
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        selectedPlayer = availablePlayers[randomIndex];
        newUsedPlayerIds = [...tracking.usedPlayerIds, selectedPlayer.id];
        console.log(`🎯 Seleccionado de disponibles: ${selectedPlayer.name || selectedPlayer.nickname}(${selectedPlayer.id})`);
      } else {
        // Todos los jugadores ya fueron usados, reiniciar el ciclo
        console.log(`🔄 Todos los jugadores han participado en ${dynamicId}, reiniciando ciclo`);

        // Al reiniciar, evitar seleccionar inmediatamente el último jugador que participó
        let eligibleForRestart = allGamePlayers;

        // Aplicar restricción de género si existe
        if (genderRestriction) {
          eligibleForRestart = eligibleForRestart.filter(player => player.gender === genderRestriction);
        }

        if (tracking.lastPlayer && eligibleForRestart.length > 1) {
          eligibleForRestart = eligibleForRestart.filter(player => player.id !== tracking.lastPlayer.id);
          console.log(`🔄 Al reiniciar, evitando inmediatamente a ${tracking.lastPlayer.name || tracking.lastPlayer.nickname}`);
        }

        const randomIndex = Math.floor(Math.random() * eligibleForRestart.length);
        selectedPlayer = eligibleForRestart[randomIndex];
        newUsedPlayerIds = [selectedPlayer.id];
        console.log(`🎯 Seleccionado después de reiniciar: ${selectedPlayer.name || selectedPlayer.nickname}(${selectedPlayer.id})`);
      }

      setSelectedPlayerForQuestion(selectedPlayer);
      dispatch(setMentionChallengePlayer({
        dynamicId,
        player: selectedPlayer,
        usedPlayerIds: newUsedPlayerIds
      }));

      console.log(`🎯 IDs guardados para ${dynamicId}: [${newUsedPlayerIds.join(', ')}]`);
      console.log(`🎯 Progreso en ${dynamicId}: ${newUsedPlayerIds.length}/${allGamePlayers.length}`);
      console.log(`🎯 ==========================================`);
    } else {
      setSelectedPlayerForQuestion(null);
    }
  }, [currentQuestion?.id, allGamePlayers.length]);

  // Efecto para desbloquear dinámicas automáticamente cuando se agregan nuevos jugadores
  useEffect(() => {
    // Desbloquear dinámicas paired_challenge cuando se agregan jugadores
    if (allGamePlayers.length > 0 && skippedPairedDynamicIds.current.size > 0) {
      console.log('🔓 DESBLOQUEO AUTOMÁTICO - Nuevos jugadores detectados');
      console.log('🔓 Total jugadores actual:', allGamePlayers.length);
      console.log('🔓 Dinámicas bloqueadas antes:', Array.from(skippedPairedDynamicIds.current));

      skippedPairedDynamicIds.current.clear();

      console.log('🔓 ✅ Todas las dinámicas paired_challenge han sido desbloqueadas');
      console.log('🔓 Dinámicas bloqueadas después:', Array.from(skippedPairedDynamicIds.current));
    }
  }, [allGamePlayers.length]);

  // Efecto para limpiar lastProcessedQuestionId cuando cambia la pregunta
  useEffect(() => {
    // Cuando cambia la pregunta, permitir que se procese la nueva
    lastProcessedQuestionId.current = null;
  }, [currentQuestion?.id]);

  // Efecto para seleccionar pareja de jugadores para paired_challenge (arm wrestling + rock paper scissors)
  useEffect(() => {
    // NO ejecutar si el componente no está montado
    if (!isMountedRef.current) {
      console.log('⏸️ paired_challenge useEffect cancelado - componente desmontado');
      return;
    }

    if (currentQuestion?.dynamicType === 'paired_challenge' && allGamePlayers.length >= 2) {
      const dynamicId = currentQuestion.dynamicId;
      const dynamicName = currentQuestion.dynamicName || 'paired challenge';

      if (dynamicId === 'spin_bottle') {
        console.log(`🍾 Spin Bottle - dinámica grupal, sin selección de jugadores ni auto-bloqueo`);
        return;
      }

      const requiresSameGender = dynamicId === 'arm_wrestling';

      console.log(`💪 === NUEVA PREGUNTA: ${dynamicName.toUpperCase()} ===`);
      console.log(`💪 Dynamic ID: ${dynamicId}`);
      console.log(`💪 Question ID: ${currentQuestion.id}`);
      console.log(`💪 Requiere mismo género: ${requiresSameGender}`);
      console.log(`💪 Total jugadores: ${allGamePlayers.length}`);
      console.log(`💪 🔍 Dinámicas bloqueadas: [${Array.from(skippedPairedDynamicIds.current).join(', ')}]`);

      // Prevenir loop infinito: si ya procesamos esta pregunta específica, no procesarla de nuevo
      if (lastProcessedQuestionId.current === currentQuestion.id) {
        console.log(`💪 ⏸️ Pregunta ${currentQuestion.id} ya fue procesada, evitando re-procesamiento`);
        return;
      }

      // Si esta dinámica ya fue saltada porque todos participaron, saltarla automáticamente
      if (skippedPairedDynamicIds.current.has(dynamicId)) {
        console.log(`💪 🚫 Dinámica ${dynamicName} bloqueada - todos ya participaron, saltando automáticamente`);

        const skipResult = gameEngine.skipDynamic();
        if (skipResult.success) {
          dispatch(setCurrentQuestion(skipResult.question));
          lastProcessedQuestionId.current = null;
          console.log(`💪 ⏭️ Dinámica saltada, limpiando lastProcessedQuestionId para permitir futuros saltos`);
        }
        return;
      }

      const participantsForThisDynamic = pairedChallengeTracking[dynamicId] || [];
      console.log(`💪 Jugadores que ya participaron en ${dynamicName}: [${participantsForThisDynamic.join(', ')}]`);

      // Obtener jugadores que NO han participado en ESTA dinámica
      const nonParticipants = allGamePlayers.filter(p =>
        !participantsForThisDynamic.includes(p.id || p.playerId)
      );

      console.log(`💪 Jugadores sin participar: ${nonParticipants.length}`);
      console.log(`💪 Sin participar: ${nonParticipants.map(p => `${p.name || p.nickname}(${p.gender})`).join(', ')}`);

      let player1, player2;
      let shouldSkip = false;

      if (requiresSameGender) {
        // ARM WRESTLING - Requiere mismo género
        console.log(`💪 === LÓGICA ARM WRESTLING (mismo género requerido) ===`);

        // Agrupar TODOS los jugadores por género
        const playersByGender = {};
        allGamePlayers.forEach(player => {
          const gender = player.gender;
          if (!playersByGender[gender]) {
            playersByGender[gender] = [];
          }
          playersByGender[gender].push(player);
        });

        // Agrupar jugadores SIN PARTICIPAR por género
        const nonParticipantsByGender = {};
        nonParticipants.forEach(player => {
          const gender = player.gender;
          if (!nonParticipantsByGender[gender]) {
            nonParticipantsByGender[gender] = [];
          }
          nonParticipantsByGender[gender].push(player);
        });

        console.log(`💪 Jugadores por género:`, Object.keys(playersByGender).map(g => `${g}: ${playersByGender[g].length}`).join(', '));
        console.log(`💪 Sin participar por género:`, Object.keys(nonParticipantsByGender).map(g => `${g}: ${nonParticipantsByGender[g].length}`).join(', '));

        // PASO 1: Intentar encontrar género con al menos 2 jugadores SIN PARTICIPAR
        let selectedGender = null;
        for (const gender in nonParticipantsByGender) {
          if (nonParticipantsByGender[gender].length >= 2) {
            selectedGender = gender;
            console.log(`💪 ⭐ PASO 1: Encontrado género ${gender} con ${nonParticipantsByGender[gender].length} jugadores sin participar`);
            break;
          }
        }

        if (selectedGender) {
          // CASO IDEAL: Dos jugadores sin participar del mismo género
          const genderNonParticipants = nonParticipantsByGender[selectedGender];
          const randomIndex1 = Math.floor(Math.random() * genderNonParticipants.length);
          player1 = genderNonParticipants[randomIndex1];

          const remainingNonParticipants = genderNonParticipants.filter(p =>
            (p.id || p.playerId) !== (player1.id || player1.playerId)
          );
          const randomIndex2 = Math.floor(Math.random() * remainingNonParticipants.length);
          player2 = remainingNonParticipants[randomIndex2];

          console.log(`💪 ✅ CASO IDEAL: Dos jugadores sin participar del mismo género`);
          console.log(`💪 Jugador 1: ${player1.name || player1.nickname}(${player1.gender}) - SIN PARTICIPAR`);
          console.log(`💪 Jugador 2: ${player2.name || player2.nickname}(${player2.gender}) - SIN PARTICIPAR`);
        } else if (nonParticipants.length > 0) {
          // PASO 2: Hay jugadores sin participar pero no 2+ del mismo género
          // Seleccionar 1 jugador aleatorio sin participar
          const randomIndex1 = Math.floor(Math.random() * nonParticipants.length);
          player1 = nonParticipants[randomIndex1];
          const gender1 = player1.gender;

          console.log(`💪 🎯 PASO 2: Jugador prioritario (sin participar): ${player1.name || player1.nickname}(${gender1})`);

          // Buscar TODOS los jugadores del mismo género (excluyendo player1)
          const allSameGender = (playersByGender[gender1] || []).filter(p =>
            (p.id || p.playerId) !== (player1.id || player1.playerId)
          );

          if (allSameGender.length === 0) {
            // No hay otro jugador del mismo género - SALTAR
            console.log(`💪 ⚠️ No hay otro jugador del género ${gender1} disponible - SALTAR pregunta`);
            shouldSkip = true;
          } else {
            // Priorizar otros sin participar del mismo género
            const sameGenderNonParticipants = allSameGender.filter(p =>
              !participantsForThisDynamic.includes(p.id || p.playerId)
            );

            if (sameGenderNonParticipants.length > 0) {
              const randomIndex2 = Math.floor(Math.random() * sameGenderNonParticipants.length);
              player2 = sameGenderNonParticipants[randomIndex2];
              console.log(`💪 ✅ Jugador 2 (mismo género, SIN PARTICIPAR): ${player2.name || player2.nickname}(${player2.gender})`);
            } else {
              // Todos del mismo género ya participaron - emparejar con uno que ya participó
              const randomIndex2 = Math.floor(Math.random() * allSameGender.length);
              player2 = allSameGender[randomIndex2];
              console.log(`💪 ⚠️ Jugador 2 (mismo género, YA PARTICIPÓ): ${player2.name || player2.nickname}(${player2.gender})`);
            }
          }
        } else {
          // PASO 3: NO hay jugadores sin participar - verificar si podemos bloquear
          console.log(`💪 🔍 PASO 3: Verificando si se debe bloquear la dinámica`);

          // Contar cuántos géneros tienen al menos 2 jugadores
          let gendersWithMultiplePlayers = 0;
          for (const gender in playersByGender) {
            if (playersByGender[gender].length >= 2) {
              gendersWithMultiplePlayers++;
            }
          }

          if (gendersWithMultiplePlayers === 0) {
            // No hay ningún género con 2+ jugadores - SALTAR sin bloquear
            console.log(`💪 ⚠️ No hay ningún género con 2+ jugadores - SALTAR sin bloquear`);
            shouldSkip = true;
          } else {
            // Hay al menos un género con 2+ jugadores Y todos ya participaron - BLOQUEAR
            console.log(`💪 ✅ Todos los jugadores elegibles han participado - BLOQUEAR DINÁMICA`);
            console.log(`💪 🚫 Agregando ${dynamicId} a dinámicas bloqueadas`);

            skippedPairedDynamicIds.current.add(dynamicId);

            const skipResult = gameEngine.skipDynamic();
            if (skipResult.success) {
              dispatch(setCurrentQuestion(skipResult.question));
              lastProcessedQuestionId.current = null;
              console.log(`💪 ⏭️ Dinámica bloqueada y saltada automáticamente`);
            }
            return;
          }
        }
      } else {
        // ROCK PAPER SCISSORS - Sin restricción de género
        console.log(`🪨📄✂️ === LÓGICA ROCK PAPER SCISSORS (sin restricción de género) ===`);

        if (nonParticipants.length >= 2) {
          // CASO IDEAL: Dos jugadores sin participar
          const randomIndex1 = Math.floor(Math.random() * nonParticipants.length);
          player1 = nonParticipants[randomIndex1];

          const remainingNonParticipants = nonParticipants.filter(p =>
            (p.id || p.playerId) !== (player1.id || player1.playerId)
          );
          const randomIndex2 = Math.floor(Math.random() * remainingNonParticipants.length);
          player2 = remainingNonParticipants[randomIndex2];

          console.log(`🪨📄✂️ ✅ CASO IDEAL: Dos jugadores sin participar`);
          console.log(`🪨📄✂️ Jugador 1: ${player1.name || player1.nickname}(${player1.gender}) - SIN PARTICIPAR`);
          console.log(`🪨📄✂️ Jugador 2: ${player2.name || player2.nickname}(${player2.gender}) - SIN PARTICIPAR`);
        } else if (nonParticipants.length === 1) {
          // PASO 2: Solo 1 jugador sin participar - emparejarlo con cualquier otro
          player1 = nonParticipants[0];
          console.log(`🪨📄✂️ 🎯 Jugador prioritario (sin participar): ${player1.name || player1.nickname}(${player1.gender})`);

          const otherPlayers = allGamePlayers.filter(p =>
            (p.id || p.playerId) !== (player1.id || player1.playerId)
          );

          if (otherPlayers.length === 0) {
            // Solo hay 1 jugador total - SALTAR
            console.log(`🪨📄✂️ ⚠️ Solo hay 1 jugador total - SALTAR pregunta`);
            shouldSkip = true;
          } else {
            const randomIndex2 = Math.floor(Math.random() * otherPlayers.length);
            player2 = otherPlayers[randomIndex2];
            console.log(`🪨📄✂️ ✅ Jugador 2 (YA PARTICIPÓ): ${player2.name || player2.nickname}(${player2.gender})`);
          }
        } else {
          // PASO 3: NO hay jugadores sin participar - BLOQUEAR
          console.log(`🪨📄✂️ ✅ Todos los jugadores han participado - BLOQUEAR DINÁMICA`);
          console.log(`🪨📄✂️ 🚫 Agregando ${dynamicId} a dinámicas bloqueadas`);

          skippedPairedDynamicIds.current.add(dynamicId);

          const skipResult = gameEngine.skipDynamic();
          if (skipResult.success) {
            dispatch(setCurrentQuestion(skipResult.question));
            lastProcessedQuestionId.current = null;
            console.log(`🪨📄✂️ ⏭️ Dinámica bloqueada y saltada automáticamente`);
          }
          return;
        }
      }

      // Si debemos saltar la pregunta (sin bloquear dinámica)
      if (shouldSkip) {
        setSelectedPairedPlayers({ player1: null, player2: null });

        const skipResult = gameEngine.skipDynamic();
        if (skipResult.success) {
          dispatch(setCurrentQuestion(skipResult.question));
          lastProcessedQuestionId.current = null;
          console.log(`💪 ⏭️ Pregunta saltada automáticamente (sin bloquear dinámica)`);
        }
        return;
      }

      // Guardar la pareja seleccionada
      setSelectedPairedPlayers({ player1, player2 });

      if (dynamicId === 'prize_roulette') {
        dispatch(addPairedChallengeParticipants({
          dynamicId,
          player1Id: player1.id || player1.playerId,
          player2Id: null
        }));
        console.log(`🎰 ✅ Jugador seleccionado: ${player1.name || player1.nickname}`);
        console.log(`🎰 📊 Participantes actuales: [${participantsForThisDynamic.join(', ')}]`);
        console.log(`🎰 📊 Después de esta ronda: ${participantsForThisDynamic.length + 1}/${allGamePlayers.length} jugadores habrán participado`);
      } else {
        dispatch(addPairedChallengeParticipants({
          dynamicId,
          player1Id: player1.id || player1.playerId,
          player2Id: player2.id || player2.playerId
        }));
        console.log(`💪 ✅ Pareja seleccionada: ${player1.name || player1.nickname} vs ${player2.name || player2.nickname}`);
        console.log(`💪 📊 Participantes actuales: [${participantsForThisDynamic.join(', ')}]`);
        console.log(`💪 📊 Después de esta ronda: ${participantsForThisDynamic.length + 2}/${allGamePlayers.length} jugadores habrán participado`);
      }

      // Marcar esta pregunta como procesada para evitar re-procesamiento en este ciclo
      lastProcessedQuestionId.current = currentQuestion.id;

      console.log(`💪 ==========================================`);
    } else {
      setSelectedPairedPlayers({ player1: null, player2: null });
    }
  }, [currentQuestion?.id, allGamePlayers.length]);

  // Formatear texto de pregunta con nombre del jugador
  const getFormattedQuestionText = () => {
    if (currentQuestion?.dynamicType === 'mention_challenge' && selectedPlayerForQuestion) {
      const playerName = selectedPlayerForQuestion.name || selectedPlayerForQuestion.nickname || 'Jugador';
      return { type: 'mention_challenge', playerName, questionText: currentQuestion.text };
    }
    if (currentQuestion?.dynamicType === 'paired_challenge') {
      if (selectedPairedPlayers.player1 && selectedPairedPlayers.player2) {
        const player1Name = selectedPairedPlayers.player1.name || selectedPairedPlayers.player1.nickname || 'Jugador 1';
        const player2Name = selectedPairedPlayers.player2.name || selectedPairedPlayers.player2.nickname || 'Jugador 2';
        return {
          type: 'paired_challenge',
          player1Name,
          player2Name,
          template: currentQuestion.text
        };
      } else {
        // Si no hay jugadores seleccionados aún, mostrar el template con placeholders
        return {
          type: 'paired_challenge',
          player1Name: 'Jugador 1',
          player2Name: 'Jugador 2',
          template: currentQuestion.text
        };
      }
    }
    return { type: 'default', questionText: currentQuestion?.text };
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
                style={[styles.line, { top: scaleByContent(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 20 : 40, 'spacing') + (index * scaleByContent(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 18 : 25, 'spacing')) }]}
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
          <Text style={styles.gameEndSubtitle}>Has completado {currentRound} rondas</Text>

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
              style={[styles.line, { top: scaleByContent(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 20 : 40, 'spacing') + (index * scaleByContent(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 18 : 25, 'spacing')) }]}
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
            right: rightOffset,
            top: topOffset + scaleByContent(20, 'spacing'),
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
            size={scaleModerate(50, 0.3)}
            isMuted={isMuted}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Botón de Configuración */}
      <Animated.View
        style={[
          styles.configButton,
          {
            right: rightOffset + scaleByContent(70, 'interactive'),
            top: topOffset + scaleByContent(20, 'spacing'),
            transform: [{ scale: configButtonScale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleConfigPress}
          style={styles.iconButtonTouchable}
          activeOpacity={0.8}
        >
          <CustomConfigIcon size={scaleModerate(50, 0.3)} />
        </TouchableOpacity>
      </Animated.View>

      {/* Indicador de ronda */}
      <View style={styles.roundIndicator}>
        <Text style={styles.roundText}>Ronda {currentRound} de {totalRounds}</Text>
      </View>

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Renderizar PreferenceVoteDisplay si es preference_vote */}
        {currentQuestion?.dynamicType === 'preference_vote' ? (
          <PreferenceVoteDisplay
            question={currentQuestion}
            allGamePlayers={allGamePlayers}
            onComplete={handleContinue}
            onSkipDynamic={handleSkipDynamic}
          />
        ) : currentQuestion?.dynamicType === 'anonymous_vote' ? (
          <AnonymousVoteDisplay
            question={currentQuestion}
            allGamePlayers={allGamePlayers}
            onComplete={handleContinue}
            onSkipDynamic={handleSkipDynamic}
          />
        ) : currentQuestion?.dynamicId === 'charades_dynamic' ? (
          <CharadesDisplay
            question={currentQuestion}
            player1Name={selectedPairedPlayers.player1?.name || selectedPairedPlayers.player1?.nickname || 'Jugador 1'}
            player2Name={selectedPairedPlayers.player2?.name || selectedPairedPlayers.player2?.nickname || 'Jugador 2'}
            onComplete={handleContinue}
            onSkipDynamic={handleSkipDynamic}
          />
        ) : currentQuestion?.dynamicId === 'prize_roulette' ? (
          <PrizeRouletteDisplay
            question={currentQuestion}
            player1Name={selectedPairedPlayers.player1?.name || selectedPairedPlayers.player1?.nickname || 'Jugador 1'}
            onComplete={handleContinue}
            onSkipDynamic={handleSkipDynamic}
          />
        ) : currentQuestion?.dynamicId === 'spin_bottle' ? (
          <SpinBottleDisplay
            question={currentQuestion}
            onComplete={handleContinue}
            onSkipDynamic={handleSkipDynamic}
          />
        ) : (
          <>
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
            {(() => {
              const formattedText = getFormattedQuestionText();

              if (formattedText.type === 'mention_challenge') {
                // Dinámica mention_challenge - mostrar nombre subrayado + texto
                return (
                  <Text style={[
                    styles.questionText,
                    { fontSize: getQuestionFontSize(formattedText.questionText) }
                  ]}>
                    <Text style={styles.playerNameUnderlined}>{formattedText.playerName}</Text>
                    {` ${formattedText.questionText}`}
                  </Text>
                );
              } else if (formattedText.type === 'paired_challenge') {
                // Dinámica paired_challenge - solo mostrar si hay jugadores seleccionados
                if (!selectedPairedPlayers.player1 || !selectedPairedPlayers.player2) {
                  // No mostrar texto hasta que se seleccionen los jugadores
                  return null;
                }

                const parts = formattedText.template.split('{player1}');
                const beforePlayer1 = parts[0];
                const afterPlayer1Parts = parts[1].split('{player2}');
                const betweenPlayers = afterPlayer1Parts[0];
                const afterPlayer2 = afterPlayer1Parts[1];

                const fullText = `${beforePlayer1}${formattedText.player1Name}${betweenPlayers}${formattedText.player2Name}${afterPlayer2}`;

                return (
                  <Text style={[
                    styles.questionText,
                    { fontSize: getQuestionFontSize(fullText) }
                  ]}>
                    {beforePlayer1}
                    <Text style={styles.playerNameUnderlined}>{formattedText.player1Name}</Text>
                    {betweenPlayers}
                    <Text style={styles.playerNameUnderlined}>{formattedText.player2Name}</Text>
                    {afterPlayer2}
                  </Text>
                );
              } else {
                // Otras dinámicas - mostrar texto normal
                return (
                  <Text style={[
                    styles.questionText,
                    { fontSize: getQuestionFontSize(formattedText.questionText) }
                  ]}>
                    {formattedText.questionText}
                  </Text>
                );
              }
            })()}

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
          </>
        )}
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

          // Limpiar el jugador del tracking de paired challenge
          dispatch(removePairedChallengeParticipant(playerId));
        }}
      />
    </Animated.View>
  );
};

// Obtener información del dispositivo para estilos dinámicos
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();
const screenHeight = getScreenHeight();

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
    left: scaleByContent(100, 'spacing'),
    right: scaleByContent(20, 'spacing'),
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
    left: scaleByContent(95, 'spacing'),
    top: 0,
    bottom: 0,
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
    opacity: 0.5,
  },

  holesPunch: {
    position: 'absolute',
    left: scaleByContent(30, 'spacing'),
    top: scaleByContent(60, 'spacing'),
    bottom: scaleByContent(60, 'spacing'),
    width: scaleByContent(25, 'spacing'),
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  hole: {
    width: scaleByContent(18, 'spacing'),
    height: scaleByContent(18, 'spacing'),
    borderRadius: scaleByContent(10, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#D0D0D0',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
  },

  // Botones superiores
  muteButton: {
    position: 'absolute',
    top: scaleByContent(30, 'spacing'),
    right: scaleByContent(20, 'spacing'),
    width: scaleByContent(70, 'interactive'),
    height: scaleByContent(70, 'interactive'),
    borderRadius: scaleByContent(35, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 6,
    transform: [{ rotate: '2deg' }],
    zIndex: 15,
  },

  configButton: {
    position: 'absolute',
    top: scaleByContent(30, 'spacing'),
    right: scaleByContent(90, 'spacing'),
    width: scaleByContent(70, 'interactive'),
    height: scaleByContent(70, 'interactive'),
    borderRadius: scaleByContent(35, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
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
    height: scaleByContent(3, 'spacing'),
    borderRadius: scaleByContent(2, 'spacing'),
    transform: [{ rotate: '45deg' }],
  },

  // Indicador de ronda
  roundIndicator: {
    position: 'absolute',
    top: scaleByContent(30, 'spacing'),
    left: scaleByContent(30, 'spacing'),
    backgroundColor: theme.colors.postItYellow,
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    borderRadius: scaleByContent(15, 'spacing'),
    borderTopLeftRadius: scaleByContent(5, 'spacing'),
    paddingVertical: scaleByContent(8, 'spacing'),
    paddingHorizontal: scaleByContent(15, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
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
    paddingTop: isShortHeight ? scaleByContent(25, 'spacing') : scaleByContent(40, 'spacing'),
    paddingBottom: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(15, 'spacing'),
  },

  // Instrucción
  instructionContainer: {
    alignItems: 'center',
    marginBottom: isShortHeight ? scaleByContent(12, 'spacing') : scaleByContent(20, 'spacing'),
    backgroundColor: theme.colors.postItPink,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 20,
    borderTopLeftRadius: 5,
    paddingVertical: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(12, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '1deg' }],
  },

  instructionText: {
    fontSize: isShortHeight ? scaleByContent(16, 'text') : scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  // Pregunta principal
  questionContainer: {
    flex: 1,
    marginVertical: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(15, 'spacing'),
    maxHeight: isShortHeight ? scaleByContent(200, 'interactive') : undefined,
    justifyContent: 'center',
    alignItems: 'center',
  },

  questionScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isShortHeight ? scaleByContent(15, 'spacing') : scaleByContent(20, 'spacing'),
    paddingHorizontal: scaleByContent(25, 'spacing'),
  },

  questionText: {
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(12, 'spacing'),
  },

  playerNameUnderlined: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
    textDecorationColor: '#2E2E2E',
  },

  questionEmoji: {
    fontSize: isShortHeight ? scaleByContent(32, 'icon') : scaleByContent(40, 'icon'),
    textAlign: 'center',
    marginBottom: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(12, 'spacing'),
  },

  instructionAction: {
    fontSize: isShortHeight ? scaleByContent(18, 'text') : scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
  },

  // Botones de acción
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: isShortHeight ? scaleByContent(10, 'spacing') : scaleByContent(15, 'spacing'),
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
    fontSize: scaleByContent(12, 'text'),
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