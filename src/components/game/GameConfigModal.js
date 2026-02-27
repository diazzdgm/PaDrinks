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
import { Haptics } from '../../utils/platform';
import { theme } from '../../styles/theme';
import {
  scale,
  scaleWidth,
  scaleHeight,
  scaleText,
  scaleModerate,
  scaleByContent,
  scaleBorder,
  getDeviceType,
  isSmallDevice,
  isTablet,
  isShortHeightDevice,
  getScreenHeight,
  RESPONSIVE,
  getDeviceInfo
} from '../../utils/responsive';
import { removePlayer, clearAllPlayers } from '../../store/playersSlice';
import { endGame, resetGame, setCurrentQuestion } from '../../store/gameSlice';
import { getGameEngine } from '../../game/GameEngine';

const GameConfigModal = ({ visible, onClose, navigation, allGamePlayers = [], onPlayerRemoved }) => {
  const dispatch = useDispatch();
  const gameEngine = getGameEngine();

  // Redux state
  const { playersList } = useSelector(state => state.players);
  const { currentRound, totalRounds } = useSelector(state => state.game);

  // TODOS los jugadores del juego (pasados como prop desde GameScreen)
  const allPlayers = allGamePlayers;

  // Local state
  const [confirmingAction, setConfirmingAction] = useState(null); // 'kick-player-id', 'end-game', 'kick-mode'
  const [showKickMode, setShowKickMode] = useState(false);

  // Animations
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrada - Solo timing para iOS
      modalAnim.setValue(0);
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Salida
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const playBeerSound = async () => {
    await audioService.playSoundEffect('beer');
  };

  const playWinePopSound = async () => {
    await audioService.playSoundEffect('wine');
  };

  const handleAddPlayer = async () => {
    // Validar límite máximo de jugadores
    if (allPlayers.length >= 16) {
      // No se puede agregar, mostrar feedback
      return;
    }

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
        playerCount: allPlayers.length + 1,
        isAddingPlayer: true,
        currentPlayers: allPlayers, // Pasar TODOS los jugadores del GameEngine
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
    if (allPlayers.length <= 3) {
      // No se puede expulsar, mostrar feedback
      setConfirmingAction(null);
      return;
    }

    // Usar comparación consistente de tipos para encontrar el jugador
    const expulsedPlayer = allPlayers.find(p => String(p.id) === String(playerId));
    console.log('🎮 Jugador a expulsar:', expulsedPlayer?.name || expulsedPlayer?.nickname);

    // Actualizar GameEngine con nueva lista de jugadores (remover el jugador expulsado)
    console.log('🎮 ID a remover:', playerId, 'tipo:', typeof playerId);
    console.log('🎮 IDs en allPlayers:', allPlayers.map(p => ({ id: p.id, tipo: typeof p.id })));

    // Convertir ambos IDs a string para comparación consistente
    const updatedPlayers = allPlayers.filter(p => String(p.id) !== String(playerId));
    gameEngine.updatePlayers(updatedPlayers);

    // Notificar a GameScreen para remover el jugador específico
    if (onPlayerRemoved) {
      onPlayerRemoved(playerId);
    }

    // Si el jugador estaba en Redux (agregado dinámicamente), también removerlo de Redux
    const playerInRedux = playersList.find(p => p.id === playerId);
    if (playerInRedux) {
      dispatch(removePlayer(playerId));
    }

    console.log('🎮 Jugador expulsado exitosamente');
    console.log('🎮 Total jugadores restantes en GameEngine:', updatedPlayers.length);

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

    console.log('🧹 === INICIANDO LIMPIEZA COMPLETA DESDE MODAL DE CONFIG ===');

    // 1. Clear currentQuestion FIRST to prevent useEffect processing old data
    dispatch(setCurrentQuestion(null));
    console.log('🧹 Pregunta actual limpiada desde modal');

    // 2. End game in GameEngine
    const result = gameEngine.endGame('manual');
    console.log('🧹 GameEngine.endGame() ejecutado');

    // 3. Clear Redux state
    dispatch(clearAllPlayers());
    console.log('🧹 Todos los jugadores eliminados de Redux');

    dispatch(resetGame());
    console.log('🧹 Estado del juego reseteado en Redux');

    if (result.success) {
      dispatch(endGame({
        gameStats: result.gameStats,
        reason: 'manual'
      }));
    }

    console.log('🧹 === LIMPIEZA COMPLETA TERMINADA DESDE MODAL ===');

    onClose();

    setTimeout(() => {
      // RESETEAR el stack de navegación para desmontar completamente GameScreen
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainMenu' }],
      });
      console.log('🧹 Stack de navegación reseteado desde modal - GameScreen desmontado');
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

  const { width: _rw, height: _rh } = Dimensions.get('window');
  const SCREEN_WIDTH = Math.max(_rw, _rh);
  const isSmallScreen = isSmallDevice();

  if (!visible) return null;

  return (
    <View style={styles.absoluteModalOverlay}>
      <View style={styles.modalWrapper}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: modalAnim,
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
                      style={[
                        styles.actionButton,
                        allPlayers.length >= 16 && styles.actionButtonDisabled
                      ]}
                      onPress={handleAddPlayer}
                      activeOpacity={allPlayers.length >= 16 ? 1 : 0.8}
                      disabled={allPlayers.length >= 16}
                    >
                      <Text style={[
                        styles.actionButtonText,
                        allPlayers.length >= 16 && styles.actionButtonTextDisabled
                      ]}>+ Agregar Jugador</Text>
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

                  {/* Información de límites */}
                  <View style={styles.limitsInfo}>
                    <Text style={styles.limitsInfoText}>
                      Jugadores: {allPlayers.length}/16 (mínimo 3)
                    </Text>
                    {allPlayers.length >= 16 && (
                      <Text style={styles.maxPlayersWarning}>
                        Máximo de jugadores alcanzado
                      </Text>
                    )}
                  </View>
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

                  <ScrollView
                    style={styles.playersScrollView}
                    contentContainerStyle={styles.playersScrollContent}
                    showsVerticalScrollIndicator={true}
                  >
                    {(() => {
                      console.log('🎮 TODOS los jugadores (Props):', allPlayers);
                      console.log('🎮 Jugadores agregados dinámicamente (Redux):', playersList);
                      console.log('🎮 Estructura de allPlayers:', allPlayers.map(p => ({
                        id: p.id,
                        name: p.name || p.nickname,
                        isHost: p.isHost
                      })));
                      const nonHostPlayers = allPlayers.filter(player => !player.isHost);
                      console.log('🎮 Jugadores no-host disponibles para expulsar:', nonHostPlayers);
                      return nonHostPlayers.map((player, index) => (
                        <TouchableOpacity
                          key={player.id}
                          style={[
                            styles.playerCardList,
                            { transform: [{ rotate: index % 2 === 0 ? '1deg' : '-1deg' }] },
                            allPlayers.length <= 3 && styles.playerCardDisabled
                          ]}
                          onPress={() => allPlayers.length > 3 ? handleKickPlayer(player.id) : null}
                          activeOpacity={allPlayers.length > 3 ? 0.8 : 1}
                          disabled={allPlayers.length <= 3}
                        >
                          <Text style={styles.playerCardName}>{player.name || player.nickname}</Text>
                        </TouchableOpacity>
                      ));
                    })()}
                  </ScrollView>

                  {allPlayers.length <= 3 && (
                    <Text style={styles.minPlayersWarning}>
                      Mínimo 3 jugadores requeridos
                    </Text>
                  )}

                  {allPlayers.filter(player => !player.isHost).length === 0 && (
                    <View style={styles.noPlayersContainer}>
                      <Text style={styles.noPlayersWarning}>
                        No hay jugadores para expulsar
                      </Text>
                      <Text style={styles.noPlayersSubtext}>
                        Total de jugadores: {allPlayers.length}
                      </Text>
                      <Text style={styles.noPlayersSubtext}>
                        Hosts: {allPlayers.filter(p => p.isHost).length}
                      </Text>
                    </View>
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
                    // Usar comparación consistente de tipos
                    const player = allPlayers.find(p => String(p.id) === String(playerId));
                    return player ? (
                      <Text style={styles.confirmationText}>
                        ¿Estás seguro de que quieres expulsar a {player.name || player.nickname}?
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
      </View>
    </View>
  );
};

const { width: _rawW, height: _rawH } = Dimensions.get('window');
const SCREEN_WIDTH = Math.max(_rawW, _rawH);
const SCREEN_HEIGHT = Math.min(_rawW, _rawH);
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();
const screenHeight = getScreenHeight();

const styles = StyleSheet.create({
  absoluteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  },

  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: isSmallScreen ? '90%' : '80%',
    maxWidth: 450,
    maxHeight: isShortHeight ? screenHeight * 0.85 : undefined,
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
    paddingVertical: isShortHeight ? scaleByContent(12, 'spacing') : scaleByContent(20, 'spacing'),
    borderBottomWidth: scaleBorder(2),
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },

  modalTitle: {
    fontSize: scaleByContent(22, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    transform: [{ rotate: '0deg' }],
  },

  closeButton: {
    width: 35,
    height: 35,
    backgroundColor: '#FF6B6B',
    borderRadius: 17.5,
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: '0deg' }],
  },

  closeButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },

  // Contenido
  modalContent: {
    paddingHorizontal: scaleByContent(20, 'spacing'),
    paddingVertical: isShortHeight ? scaleByContent(10, 'spacing') : scaleByContent(15, 'spacing'),
  },

  buttonsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: isShortHeight ? scaleByContent(12, 'spacing') : scaleByContent(20, 'spacing'),
    gap: scaleByContent(10, 'spacing'),
  },


  // Botones de acción
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.postItGreen,
    borderWidth: scaleBorder(2),
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
    transform: [{ rotate: '0deg' }],
  },

  kickModeButton: {
    backgroundColor: theme.colors.postItPink,
    transform: [{ rotate: '0deg' }],
  },

  actionButtonText: {
    fontSize: scaleByContent(13, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  actionButtonDisabled: {
    backgroundColor: '#F0F0F0',
    opacity: 0.6,
  },

  actionButtonTextDisabled: {
    color: '#999999',
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
    borderWidth: scaleBorder(2),
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

  playersScrollView: {
    maxHeight: scaleByContent(200, 'spacing'),
    marginBottom: scaleByContent(15, 'spacing'),
  },

  playersScrollContent: {
    paddingVertical: scaleByContent(10, 'spacing'),
  },

  playerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
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

  playerCardList: {
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: 10,
    paddingVertical: scaleByContent(12, 'spacing'),
    paddingHorizontal: scaleByContent(15, 'spacing'),
    marginBottom: scaleByContent(8, 'spacing'),
    marginHorizontal: scaleByContent(10, 'spacing'),
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
    borderWidth: scaleBorder(2),
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

  noPlayersWarning: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: scaleByContent(5, 'spacing'),
  },

  noPlayersContainer: {
    alignItems: 'center',
    paddingVertical: scaleByContent(15, 'spacing'),
  },

  noPlayersSubtext: {
    fontSize: scaleByContent(10, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#999',
    textAlign: 'center',
    marginTop: scaleByContent(2, 'spacing'),
  },

  limitsInfo: {
    alignItems: 'center',
    marginTop: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(15, 'spacing'),
    paddingTop: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(15, 'spacing'),
    borderTopWidth: scaleBorder(1),
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },

  limitsInfoText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666',
    textAlign: 'center',
  },

  maxPlayersWarning: {
    fontSize: scaleByContent(11, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: scaleByContent(5, 'spacing'),
  },

  // Botón terminar juego
  endGameButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: scaleBorder(2),
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
    transform: [{ rotate: '0deg' }],
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
    transform: [{ rotate: '0deg' }],
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
    borderWidth: scaleBorder(3),
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
    transform: [{ rotate: '0deg' }],
  },

  cancelButtonText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },

  confirmButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: scaleBorder(3),
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
    transform: [{ rotate: '0deg' }],
  },

  confirmButtonText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default GameConfigModal;