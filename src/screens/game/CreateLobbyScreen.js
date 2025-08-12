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
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../../styles/theme';

// 🔊 ICONO PERSONALIZADO USANDO PNG
const CustomMuteIcon = ({ size = 50, isMuted = false }) => {
  return (
    <View style={styles.customIconContainer}>
      <Image 
        source={require('../../../assets/images/Megaphone.MUTE.png')}
        style={[
          styles.megaphoneImage,
          { 
            width: size, 
            height: size,
            opacity: isMuted ? 0.6 : 1,
          }
        ]}
        resizeMode="contain"
      />
      
      {/* Indicador adicional para estado muted - X roja más visible */}
      {isMuted && (
        <View style={styles.mutedIndicator}>
          <View style={[styles.mutedLine, { backgroundColor: '#FF0000' }]} />
          <View style={[styles.mutedLine, { backgroundColor: '#FF0000', transform: [{ rotate: '90deg' }] }]} />
        </View>
      )}
    </View>
  );
};

const CreateLobbyScreen = ({ navigation, route }) => {
  // Redux
  const dispatch = useDispatch();
  
  // Parámetros de navegación
  const { gameMode, playMethod, connectionType, playerCount, registeredPlayers, playerData } = route.params;
  
  // Estados
  const [roomCode, setRoomCode] = useState('');
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [isHost, setIsHost] = useState(true);
  const [currentUserId] = useState('user123'); // Mock user ID
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const leftSideAnim = useRef(new Animated.Value(-300)).current;
  const rightSideAnim = useRef(new Animated.Value(300)).current;
  const startButtonAnim = useRef(new Animated.Value(50)).current;
  
  // Referencias para sonidos
  const beerSound = useRef(null);
  
  // Estado y animación para el botón de mute
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const muteButtonScale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    React.useCallback(() => {
      // Sincronizar estado de mute cuando regresamos a la pantalla
      setIsMuted(audioService.isMusicMuted);
      
      // Generar código de sala
      generateRoomCode();
      
      // Configurar jugadores
      if (playMethod === 'single' && registeredPlayers) {
        // Para modo single device, usar los jugadores registrados
        const players = registeredPlayers.map((player, index) => ({
          id: player.playerId,
          name: player.nickname,
          avatar: player.photoUri,
          emoji: player.emoji,
          isHost: index === 0,
          isCurrentUser: index === 0,
          gender: player.gender,
          orientation: player.orientation,
        }));
        setConnectedPlayers(players);
        console.log('🎮 Single device players loaded:', players);
      } else if (playMethod === 'single') {
        // Fallback para modo single device sin registeredPlayers
        const mockPlayers = [];
        for (let i = 1; i <= playerCount; i++) {
          mockPlayers.push({
            id: i === 1 ? currentUserId : `player${i}`,
            name: i === 1 ? 'Tú' : `Jugador ${i}`,
            avatar: null,
            emoji: '😄',
            isHost: i === 1,
            isCurrentUser: i === 1,
          });
        }
        setConnectedPlayers(mockPlayers);
      } else {
        // Para modo multiplayer, usar datos del jugador registrado si están disponibles
        if (playerData) {
          setConnectedPlayers([{
            id: currentUserId,
            name: playerData.nickname,
            avatar: playerData.photoUri,
            emoji: playerData.emoji,
            isHost: true,
            isCurrentUser: true,
            gender: playerData.gender,
            orientation: playerData.orientation,
          }]);
          console.log('🎮 Multiplayer player loaded:', playerData);
        } else {
          // Fallback para modo multiplayer sin playerData
          setConnectedPlayers([{
            id: currentUserId,
            name: 'Tú',
            avatar: null,
            emoji: '😄',
            isHost: true,
            isCurrentUser: true,
          }]);
        }
      }
      
      // Animaciones de entrada
      startEntranceAnimations();
      
      return () => {
        cleanupSound();
      };
    }, [])
  );

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomCode(result);
  };

  const cleanupSound = async () => {
    if (beerSound.current) {
      try {
        await beerSound.current.unloadAsync();
      } catch (error) {
        console.log('Error cleaning up beer sound:', error);
      }
    }
  };

  const startEntranceAnimations = () => {
    // Resetear valores
    fadeAnim.setValue(0);
    leftSideAnim.setValue(-300);
    rightSideAnim.setValue(300);
    startButtonAnim.setValue(50);

    // Animación de entrada
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(leftSideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(rightSideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(startButtonAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const playBeerSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: soundObject } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/beer.can.sound.mp3'),
        {
          shouldPlay: true,
          isLooping: false,
          volume: 0.8,
        }
      );
      
      beerSound.current = soundObject;
      console.log('🍺 Reproduciendo sonido de lata de cerveza...');
      
    } catch (error) {
      console.log('Error loading beer sound:', error);
    }
  };

  const toggleMute = async () => {
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

  const handleGoBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    navigation.goBack();
  };

  const handleKickPlayer = (playerId) => {
    if (!isHost || playerId === currentUserId) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    Alert.alert(
      '⚠️ Expulsar Jugador',
      '¿Estás seguro de que quieres expulsar a este jugador?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Expulsar',
          style: 'destructive',
          onPress: () => {
            setConnectedPlayers(prev => prev.filter(p => p.id !== playerId));
            playBeerSound();
          },
        },
      ]
    );
  };

  const handleCopyRoomCode = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    // Mock clipboard functionality
    Alert.alert('📋 Copiado', 'Código de sala copiado al portapapeles');
    playBeerSound();
  };

  const handleStartGame = () => {
    if (connectedPlayers.length < 3) {
      Alert.alert('⚠️ Jugadores Insuficientes', 'Necesitas al menos 3 jugadores para iniciar el juego.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    playBeerSound();
    
    // TODO: Navegar a pantalla de juego
    Alert.alert('🎮 ¡Iniciando Juego!', `${connectedPlayers.length} jugadores listos para jugar`);
  };

  const canStartGame = connectedPlayers.length >= 3;

  // Generar slots vacíos si es necesario
  const maxSlots = playMethod === 'single' ? playerCount : 10;
  const emptySlots = Math.max(0, maxSlots - connectedPlayers.length);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Fondo de papel con líneas */}
      <View style={styles.paperBackground}>
        <View style={styles.notebookLines}>
          {[...Array(20)].map((_, index) => (
            <View 
              key={index} 
              style={[styles.line, { top: 40 + (index * 25) }]} 
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

      {/* Botón de regreso */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleGoBack}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>← Atrás</Text>
      </TouchableOpacity>
      
      {/* Botón de Mute */}
      <Animated.View 
        style={[
          styles.sketchMuteButton,
          {
            transform: [{ scale: muteButtonScale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={toggleMute}
          style={styles.muteButtonTouchable}
          activeOpacity={0.8}
        >
          <CustomMuteIcon 
            size={50}
            isMuted={isMuted}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Contenido principal dividido 70/30 */}
      <View style={styles.mainContent}>
        
        {/* LADO IZQUIERDO (70%) - Información de la Sala */}
        <Animated.View 
          style={[
            styles.leftSide,
            { transform: [{ translateX: leftSideAnim }] }
          ]}
        >
          <Text style={styles.roomTitle}>SALA CREADA</Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Esperando Jugadores ({connectedPlayers.length}/15)
            </Text>
          </View>

          {/* Lista de Jugadores */}
          <View style={styles.playersListContainer}>
            <Text style={styles.playersListTitle}>Jugadores:</Text>
            
            <ScrollView 
              style={styles.playersScrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* Jugadores conectados */}
              {connectedPlayers.map((player) => (
                <View key={player.id} style={styles.playerItem}>
                  <View style={[
                    styles.playerAvatar,
                    player.avatar ? styles.playerAvatarWithPhoto : null
                  ]}>
                    {player.avatar ? (
                      <Image source={{ uri: player.avatar }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarEmoji}>{player.emoji || '😄'}</Text>
                    )}
                  </View>
                  
                  <View style={styles.playerInfo}>
                    <View style={styles.playerNameContainer}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      {player.isHost && <Text style={styles.crownEmoji}>👑</Text>}
                      {player.isCurrentUser && <Text style={styles.youIndicator}>(Tú)</Text>}
                    </View>
                  </View>
                  
                  {/* Botón expulsar (solo para host) */}
                  {isHost && !player.isCurrentUser && (
                    <TouchableOpacity
                      style={styles.kickButton}
                      onPress={() => handleKickPlayer(player.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.kickButtonText}>❌</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              {/* Slots vacíos */}
              {Array.from({ length: emptySlots }, (_, index) => (
                <View key={`empty-${index}`} style={styles.emptySlot}>
                  <View style={styles.emptyAvatar}>
                    <Text style={styles.emptyAvatarText}>?</Text>
                  </View>
                  <Text style={styles.emptySlotText}>Esperando...</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        {/* LADO DERECHO (30%) - Compartir Sala */}
        <Animated.View 
          style={[
            styles.rightSide,
            { transform: [{ translateX: rightSideAnim }] }
          ]}
        >
          {playMethod !== 'single' && (
            <>
              <Text style={styles.shareTitle}>
                {playMethod === 'multiple' ? 'Comparte este QR' : 'Únete a la sala'}
              </Text>
              
              {/* Área del QR */}
              <View style={styles.qrContainer}>
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>📱</Text>
                  <Text style={styles.qrPlaceholderSubtext}>Código QR</Text>
                </View>
              </View>
              
              {/* Código de sala */}
              <View style={styles.roomCodeContainer}>
                <Text style={styles.roomCodeLabel}>Código:</Text>
                <Text style={styles.roomCodeText}>{roomCode}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyRoomCode}
                  activeOpacity={0.8}
                >
                  <Text style={styles.copyButtonText}>📋</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.instructionText}>
                Escanea el QR o usa el código
              </Text>
              
              {/* Botón Iniciar Juego - Movido aquí */}
              <Animated.View 
                style={[
                  styles.startGameButtonContainer,
                  { 
                    transform: [{ translateY: startButtonAnim }],
                    opacity: canStartGame ? 1 : 0.5,
                  }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.startGameButton,
                    { backgroundColor: canStartGame ? theme.colors.postItGreen : '#CCCCCC' }
                  ]}
                  onPress={handleStartGame}
                  activeOpacity={canStartGame ? 0.8 : 1}
                  disabled={!canStartGame}
                >
                  <Text style={[
                    styles.startGameButtonText,
                    { color: canStartGame ? '#2E2E2E' : '#666666' }
                  ]}>
                    INICIAR JUEGO
                  </Text>
                  <Text style={styles.startGameButtonIcon}>🎮</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
          
          {playMethod === 'single' && (
            <>
              <View style={styles.singleDeviceInfo}>
                <Text style={styles.singleDeviceTitle}>MODO</Text>
                <Text style={styles.singleDeviceSubtitle}>Un Solo Dispositivo</Text>
                <Text style={styles.singleDeviceDescription}>
                  Todos los jugadores están registrados y listos para comenzar
                </Text>
              </View>
              
              {/* Botón Iniciar Juego - También para modo single */}
              <Animated.View 
                style={[
                  styles.startGameButtonContainer,
                  { 
                    transform: [{ translateY: startButtonAnim }],
                    opacity: canStartGame ? 1 : 0.5,
                  }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.startGameButton,
                    { backgroundColor: canStartGame ? theme.colors.postItGreen : '#CCCCCC' }
                  ]}
                  onPress={handleStartGame}
                  activeOpacity={canStartGame ? 0.8 : 1}
                  disabled={!canStartGame}
                >
                  <Text style={[
                    styles.startGameButtonText,
                    { color: canStartGame ? '#2E2E2E' : '#666666' }
                  ]}>
                    INICIAR JUEGO
                  </Text>
                  <Text style={styles.startGameButtonIcon}>🎮</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const { width, height } = Dimensions.get('window');

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
  
  // Botón de regreso
  backButton: {
    position: 'absolute',
    top: 40,
    left: 30,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    borderTopLeftRadius: 5,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
    zIndex: 10,
  },
  
  backButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Contenido principal
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 120,
  },
  
  // Lado izquierdo - 70% del ancho
  leftSide: {
    flex: 0.7,
    paddingRight: 20,
    paddingLeft: 20,
  },
  
  roomTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 15,
    transform: [{ rotate: '1deg' }],
  },
  
  statusContainer: {
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 15,
    borderTopLeftRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '-0.5deg' }],
  },
  
  statusText: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
  },
  
  playersListContainer: {
    flex: 1,
    minHeight: height * 0.5,
  },
  
  playersListTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: 10,
    transform: [{ rotate: '0.3deg' }],
  },
  
  playersScrollView: {
    flex: 1,
    maxHeight: height * 0.65,
  },
  
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ rotate: '-0.2deg' }],
  },
  
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.postItPink,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  
  playerAvatarWithPhoto: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  
  avatarEmoji: {
    fontSize: 20,
  },
  
  playerInfo: {
    flex: 1,
  },
  
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  playerName: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  crownEmoji: {
    fontSize: 18,
    marginLeft: 5,
  },
  
  youIndicator: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    marginLeft: 5,
    fontStyle: 'italic',
  },
  
  kickButton: {
    padding: 8,
  },
  
  kickButtonText: {
    fontSize: 18,
  },
  
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    opacity: 0.7,
    transform: [{ rotate: '0.1deg' }],
  },
  
  emptyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  
  emptyAvatarText: {
    fontSize: 20,
    color: '#999999',
  },
  
  emptySlotText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: '#999999',
    fontStyle: 'italic',
  },
  
  // Lado derecho - 30% del ancho
  rightSide: {
    flex: 0.3,
    paddingLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: '#A8C8EC',
    borderLeftStyle: 'dashed',
    alignItems: 'center',
  },
  
  shareTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    transform: [{ rotate: '-0.5deg' }],
  },
  
  qrContainer: {
    marginBottom: 20,
  },
  
  qrPlaceholder: {
    width: 140,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 15,
    borderTopLeftRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '2deg' }],
  },
  
  qrPlaceholderText: {
    fontSize: 40,
    marginBottom: 5,
  },
  
  qrPlaceholderSubtext: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: '#666666',
  },
  
  roomCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.postItBlue,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
  },
  
  roomCodeLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    marginRight: 5,
  },
  
  roomCodeText: {
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    letterSpacing: 2,
    flex: 1,
  },
  
  copyButton: {
    padding: 5,
  },
  
  copyButtonText: {
    fontSize: 16,
  },
  
  instructionText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  
  singleDeviceInfo: {
    alignItems: 'center',
    paddingTop: 40,
  },
  
  singleDeviceTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: 10,
    transform: [{ rotate: '1deg' }],
  },
  
  singleDeviceSubtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  singleDeviceDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  
  // Botón iniciar juego
  startGameButtonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  
  startGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderTopLeftRadius: 3,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '-1.5deg' }],
    minWidth: 120,
  },
  
  startGameButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.primaryBold,
    textAlign: 'center',
    marginRight: 5,
  },
  
  startGameButtonIcon: {
    fontSize: 16,
  },
  
  // Estilos para el botón de mute
  sketchMuteButton: {
    position: 'absolute',
    top: 30,
    right: 30,
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
  
  muteButtonTouchable: {
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
});

export default CreateLobbyScreen;