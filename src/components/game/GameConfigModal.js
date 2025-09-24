import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
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
import { removePlayer } from '../../store/playersSlice';
import { endGame, resetGame } from '../../store/gameSlice';
import { getGameEngine } from '../../game/GameEngine';

const GameConfigModal = ({ visible, onClose, navigation }) => {
  const dispatch = useDispatch();
  const gameEngine = getGameEngine();

  // Redux state
  const { playersList } = useSelector(state => state.players);
  const { currentRound, totalRounds } = useSelector(state => state.game);

  // Local state
  const [confirmingAction, setConfirmingAction] = useState(null); // 'kick-player-id', 'end-game', 'kick-mode'
  const [showKickMode, setShowKickMode] = useState(false);

  // Animations
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrada
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Salida
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

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

  const handleAddPlayer = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playBeerSound();
    onClose();

    // Navegar a MultiPlayerRegistration para agregar un jugador
    // Mantener el estado actual del juego pausado
    setTimeout(() => {
      navigation.navigate('MultiPlayerRegistration', {
        gameMode: 'single-device',
        playerCount: playersList.length + 1,
        isAddingPlayer: true,
        currentPlayers: playersList,
        draftPlayers: {}
      });
    }, 300);
  };

  const handleKickPlayerConfirm = async (playerId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playWinePopSound();

    // Verificar que queden al menos 3 jugadores después de expulsar
    if (playersList.length <= 3) {
      // No se puede expulsar, mostrar feedback
      setConfirmingAction(null);
      return;
    }

    // Expulsar jugador del Redux
    dispatch(removePlayer(playerId));

    // Actualizar GameEngine con nueva lista de jugadores
    const updatedPlayers = playersList.filter(p => p.id !== playerId);
    gameEngine.updatePlayers(updatedPlayers);

    setConfirmingAction(null);
    onClose();
  };

  const handleKickPlayer = (playerId) => {
    playWinePopSound();
    setConfirmingAction(`kick-${playerId}`);
  };

  const handleShowKickMode = () => {
    playWinePopSound();
    setShowKickMode(true);
  };

  const handleHideKickMode = () => {
    playWinePopSound();
    setShowKickMode(false);
  };

  const handleEndGame = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playBeerSound();

    const result = gameEngine.endGame('manual');

    if (result.success) {
      dispatch(endGame({
        gameStats: result.gameStats,
        reason: 'manual'
      }));
    }

    onClose();

    setTimeout(() => {
      navigation.navigate('MainMenu');
    }, 500);
  };

  const handleEndGameConfirm = () => {
    playWinePopSound();
    setConfirmingAction('end-game');
  };

  const handleCancelAction = () => {
    playWinePopSound();
    setConfirmingAction(null);
  };

  const handleClose = () => {
    playWinePopSound();
    setConfirmingAction(null);
    setShowKickMode(false);
    onClose();
  };

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isSmallScreen = isSmallDevice();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }
                ]
              }
            ]}
            onStartShouldSetResponder={() => true}
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

            {/* Header del modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CONFIGURACIÓN</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Contenido del modal */}
            <View style={styles.modalContent}>
              {!confirmingAction && !showKickMode && (
                <>
                  {/* Botones principales */}
                  <View style={styles.buttonsGrid}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleAddPlayer}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>+ Agregar Jugador</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.kickModeButton]}
                      onPress={handleShowKickMode}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>- Expulsar Jugador</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Botón Terminar Juego */}
                  <TouchableOpacity
                    style={styles.endGameButton}
                    onPress={handleEndGameConfirm}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.endGameButtonText}>Terminar Juego</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Modo de expulsar jugadores */}
              {showKickMode && !confirmingAction && (
                <>
                  <View style={styles.kickModeHeader}>
                    <Text style={styles.kickModeTitle}>Seleccionar jugador a expulsar:</Text>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={handleHideKickMode}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.backButtonText}>← Volver</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.playersGrid}>
                    {playersList.map((player) => (
                      <TouchableOpacity
                        key={player.id}
                        style={[
                          styles.playerCard,
                          playersList.length <= 3 && styles.playerCardDisabled
                        ]}
                        onPress={() => playersList.length > 3 ? handleKickPlayer(player.id) : null}
                        activeOpacity={playersList.length > 3 ? 0.8 : 1}
                        disabled={playersList.length <= 3}
                      >
                        <Text style={styles.playerCardName}>{player.name}</Text>
                        {player.isHost && (
                          <Text style={styles.hostIndicator}>👑</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {playersList.length <= 3 && (
                    <Text style={styles.minPlayersWarning}>
                      Mínimo 3 jugadores requeridos
                    </Text>
                  )}
                </>
              )}

              {/* Confirmación de expulsar jugador */}
              {confirmingAction?.startsWith('kick-') && (
                <View style={styles.confirmationContainer}>
                  <Text style={styles.confirmationTitle}>
                    ¿Expulsar jugador?
                  </Text>

                  {(() => {
                    const playerId = confirmingAction.replace('kick-', '');
                    const player = playersList.find(p => p.id === playerId);
                    return player ? (
                      <Text style={styles.confirmationText}>
                        ¿Estás seguro de que quieres expulsar a {player.name}?
                      </Text>
                    ) : null;
                  })()}

                  <View style={styles.confirmationButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelAction}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => {
                        const playerId = confirmingAction.replace('kick-', '');
                        handleKickPlayerConfirm(playerId);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.confirmButtonText}>Expulsar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Confirmación de terminar juego */}
              {confirmingAction === 'end-game' && (
                <View style={styles.confirmationContainer}>
                  <Text style={styles.confirmationTitle}>
                    ¿Terminar juego?
                  </Text>

                  <Text style={styles.confirmationText}>
                    ¿Estás seguro de que quieres terminar el juego?
                    Se perderá el progreso de la partida actual.
                  </Text>

                  <View style={styles.confirmationButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelAction}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={handleEndGame}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.confirmButtonText}>Terminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  backdropTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: isSmallScreen ? '90%' : '80%',
    maxWidth: 450,
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
  },

  // Fondo de papel del modal
  modalPaperBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F6F0',
    borderRadius: 17,
    borderTopLeftRadius: 2,
  },

  modalNotebookLines: {
    position: 'absolute',
    top: 0,
    left: 60,
    right: 15,
    bottom: 0,
  },

  modalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.4,
  },

  modalRedMarginLine: {
    position: 'absolute',
    left: 55,
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },

  // Header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(25, 'spacing'),
    paddingVertical: scaleByContent(20, 'spacing'),
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },

  modalTitle: {
    fontSize: scaleByContent(22, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    transform: [{ rotate: '0.5deg' }],
  },

  closeButton: {
    width: 35,
    height: 35,
    backgroundColor: '#FF6B6B',
    borderRadius: 17.5,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: '3deg' }],
  },

  closeButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },

  // Contenido
  modalContent: {
    paddingHorizontal: scaleByContent(20, 'spacing'),
    paddingVertical: scaleByContent(15, 'spacing'),
  },

  buttonsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaleByContent(20, 'spacing'),
    gap: scaleByContent(10, 'spacing'),
  },


  // Botones de acción
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    paddingVertical: scaleByContent(8, 'interactive'),
    paddingHorizontal: scaleByContent(12, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
    transform: [{ rotate: '-1deg' }],
  },

  kickModeButton: {
    backgroundColor: theme.colors.postItPink,
    transform: [{ rotate: '1deg' }],
  },

  actionButtonText: {
    fontSize: scaleByContent(13, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  // Modo kick
  kickModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
  },

  kickModeTitle: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    flex: 1,
  },

  backButton: {
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    paddingVertical: scaleByContent(4, 'interactive'),
    paddingHorizontal: scaleByContent(8, 'interactive'),
  },

  backButtonText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },

  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleByContent(8, 'spacing'),
    justifyContent: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
  },

  playerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 10,
    paddingVertical: scaleByContent(8, 'spacing'),
    paddingHorizontal: scaleByContent(12, 'spacing'),
    minWidth: scaleByContent(80, 'spacing'),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  playerCardDisabled: {
    backgroundColor: '#F0F0F0',
    opacity: 0.6,
  },

  playerCardName: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
  },

  hostIndicator: {
    fontSize: scaleByContent(16, 'icon'),
  },

  kickButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    paddingVertical: scaleByContent(6, 'interactive'),
    paddingHorizontal: scaleByContent(12, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  kickButtonText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },

  minPlayersWarning: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: scaleByContent(5, 'spacing'),
  },

  // Botón terminar juego
  endGameButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    paddingVertical: scaleByContent(8, 'interactive'),
    paddingHorizontal: scaleByContent(15, 'interactive'),
    marginTop: scaleByContent(5, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
    transform: [{ rotate: '1deg' }],
  },

  endGameButtonText: {
    fontSize: scaleByContent(13, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Confirmaciones
  confirmationContainer: {
    alignItems: 'center',
    paddingVertical: scaleByContent(20, 'spacing'),
  },

  confirmationTitle: {
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
    transform: [{ rotate: '0.5deg' }],
  },

  confirmationText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(25, 'spacing'),
    lineHeight: scaleByContent(22, 'text'),
  },

  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },

  cancelButton: {
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 15,
    borderTopLeftRadius: 3,
    paddingVertical: scaleByContent(12, 'interactive'),
    paddingHorizontal: scaleByContent(25, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: '-2deg' }],
  },

  cancelButtonText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  confirmButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 15,
    borderTopLeftRadius: 3,
    paddingVertical: scaleByContent(12, 'interactive'),
    paddingHorizontal: scaleByContent(25, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: '2deg' }],
  },

  confirmButtonText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default GameConfigModal;