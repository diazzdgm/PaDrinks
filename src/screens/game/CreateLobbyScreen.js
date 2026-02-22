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
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../../styles/theme';
import { useSafeAreaOffsets } from '../../hooks/useSafeAreaOffsets';
import { useSocket, useRoom } from '../../hooks/useSocket';
import { setRoomData } from '../../store/connectionSlice';
import { clearAllPlayers } from '../../store/playersSlice';
import { resetGame } from '../../store/gameSlice';
import SocketService from '../../services/SocketService';
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
  getDeviceInfo,
  SCREEN_WIDTH,
  SCREEN_HEIGHT 
} from '../../utils/responsive';

// 🔊 ICONO PERSONALIZADO USANDO PNG - RESPONSIVE
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
  const { isConnected } = useSelector(state => state.connection);
  
  // Socket hooks
  const { connected } = useSocket();
  const { createRoom, loading: roomLoading, error: roomError } = useRoom();

  // Safe area offsets para iOS
  const { leftOffset, rightOffset, topOffset } = useSafeAreaOffsets();

  // Parámetros de navegación
  const { 
    gameMode, 
    playMethod, 
    connectionType: routeConnectionType, 
    playerCount, 
    registeredPlayers, 
    playerData,
    isJoining, 
    roomData,
    roomCode: initialRoomCode
  } = route.params;
  
  // connectionType puede venir de route.params directamente o de playerData
  const connectionType = routeConnectionType || playerData?.connectionType;
  
  // Estados
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [isHost, setIsHost] = useState(route.params.isHost !== false); // Por defecto true, excepto si viene false
  const [currentUserId] = useState('user123'); // Mock user ID
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHostLeaveModal, setShowHostLeaveModal] = useState(false);
  const [showKickedModal, setShowKickedModal] = useState(false);
  const [showKickPlayerModal, setShowKickPlayerModal] = useState(false);
  const [playerToKick, setPlayerToKick] = useState(null);
  
  // Estados para nuevos modales personalizados
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalData, setModalData] = useState({ title: '', message: '', type: 'info' });
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const leftSideAnim = useRef(new Animated.Value(-300)).current;
  const rightSideAnim = useRef(new Animated.Value(300)).current;
  const startButtonAnim = useRef(new Animated.Value(50)).current;
  const leaveModalScale = useRef(new Animated.Value(0)).current;
  const leaveModalOpacity = useRef(new Animated.Value(0)).current;
  const hostLeaveModalScale = useRef(new Animated.Value(0)).current;
  const hostLeaveModalOpacity = useRef(new Animated.Value(0)).current;
  const kickedModalScale = useRef(new Animated.Value(0)).current;
  const kickedModalOpacity = useRef(new Animated.Value(0)).current;
  const kickPlayerModalScale = useRef(new Animated.Value(0)).current;
  const kickPlayerModalOpacity = useRef(new Animated.Value(0)).current;
  const genericModalScale = useRef(new Animated.Value(0)).current;
  const genericModalOpacity = useRef(new Animated.Value(0)).current;
  
  // audioService gestiona los sonidos automáticamente
  
  // Referencias para timeouts de sincronización
  const syncTimeoutRefs = useRef([]);
  
  // Función para cancelar todas las sincronizaciones automáticas
  const cancelAutoSync = () => {
    syncTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    syncTimeoutRefs.current = [];
    console.log('🚫 Sincronizaciones automáticas canceladas');
  };

  // Función genérica para mostrar modales personalizados
  const showCustomModal = (title, message, type = 'info') => {
    setModalData({ title, message, type });

    if (type === 'error') {
      setShowErrorModal(true);
    } else if (type === 'success') {
      setShowSuccessModal(true);
    } else {
      setShowInfoModal(true);
    }

    // Animar entrada del modal
    Animated.timing(genericModalOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Función para cerrar modales genéricos
  const handleCloseGenericModal = () => {
    Animated.timing(genericModalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowErrorModal(false);
      setShowSuccessModal(false);
      setShowInfoModal(false);
      setModalData({ title: '', message: '', type: 'info' });
    });
  };
  
  // Estado y animación para el botón de mute
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const muteButtonScale = useRef(new Animated.Value(1)).current;

  // Función para crear sala en el backend
  const handleCreateRoom = async () => {
    // Si se está uniendo a una sala existente, no crear sala nueva
    if (isJoining) {
      console.log('🔗 Jugador se unió a sala existente:', roomCode);
      console.log('🔍 DEBUG CreateLobby - roomData recibido:', JSON.stringify(roomData, null, 2));
      console.log('🔍 DEBUG CreateLobby - playerData recibido:', JSON.stringify(playerData, null, 2));
      
      // Si hay datos de la sala del backend, usar esos datos
      if (roomData && roomData.room && roomData.room.players) {
        console.log('📋 Usando datos de la sala del backend:', roomData.room.players.length, 'jugadores');
        console.log('🔍 Socket ID actual:', SocketService.socket?.id);
        console.log('🔍 isHost desde roomData:', roomData.isHost);
        
        const allPlayers = roomData.room.players.map(player => {
          const isCurrentUser = player.socketId === SocketService.socket?.id;
          console.log(`👤 Jugador: ${player.nickname}, socketId: ${player.socketId}, isHost: ${player.isHost}, isCurrentUser: ${isCurrentUser}`);
          
          return {
            id: player.id,
            name: player.nickname,
            nickname: player.nickname,
            emoji: player.emoji || '😄',
            avatar: player.photoUri || player.avatar,
            photoUri: player.photoUri,
            photo: player.photo,
            isHost: player.isHost, // Usar directamente del backend
            isCurrentUser: isCurrentUser,
            gender: player.gender,
            orientation: player.orientation
          };
        });
        
        setConnectedPlayers(allPlayers);
        setIsHost(roomData.isHost || false);
        
        console.log('🔄 Jugadores configurados:', allPlayers.map(p => `${p.nickname}(${p.isHost ? 'HOST' : 'PLAYER'}, current: ${p.isCurrentUser})`));
        
        // Solicitar sincronización adicional por si falta información
        if (SocketService.connected) {
          // Sincronización inmediata para jugadores que se unen
          console.log('📡 Solicitando sincronización inmediata...');
          SocketService.socket.emit('syncRoom');
          
          // Sincronización adicional para asegurar
          const timeout1 = setTimeout(() => {
            console.log('📡 Solicitando sincronización adicional...');
            SocketService.socket.emit('syncRoom');
          }, 2000);
          
          // Una más por si acaso
          const timeout2 = setTimeout(() => {
            console.log('📡 Solicitando sincronización final...');
            SocketService.socket.emit('syncRoom');
          }, 5000);
          
          // Guardar referencias para poder cancelarlos
          syncTimeoutRefs.current.push(timeout1, timeout2);
        }
      } else {
        // NO usar fallback local - siempre esperar datos del backend
        console.log('⏳ Esperando datos del backend...');
        setConnectedPlayers([]); // Limpiar lista mientras carga
        
        // Solicitar lista completa de jugadores en la sala inmediatamente
        if (SocketService.connected) {
          console.log('📡 Solicitando lista completa de jugadores de la sala...');
          SocketService.socket.emit('syncRoom');
          
          // Solicitar sincronización adicional después de 2 segundos
          const timeout3 = setTimeout(() => {
            console.log('📡 Solicitando sincronización adicional...');
            SocketService.socket.emit('syncRoom');
          }, 2000);
          
          // Guardar referencia para poder cancelarlo
          syncTimeoutRefs.current.push(timeout3);
        }
      }
      return;
    }
    
    // Determinar si crear sala online o local basado en playMethod
    if (playMethod === 'multiple' && connectionType === 'wifi' && (connected || isConnected || SocketService.connected)) {
      try {
        setIsCreatingRoom(true);
        console.log('🏠 Creando sala ONLINE para múltiples dispositivos...');
        
        const roomData = await createRoom({
          maxPlayers: 8,
          nickname: playerData.nickname,
          avatar: playerData.photoUri,
          emoji: playerData.emoji,
          photo: playerData.photo,
          photoUri: playerData.photoUri,
          gender: playerData.gender,
          orientation: playerData.orientation,
          gameType: gameMode,
          settings: {
            gameMode: gameMode,
            playMethod: playMethod,
            connectionType: connectionType
          }
        });

        // Actualizar Redux con datos de la sala
        dispatch(setRoomData({
          room: roomData.room,
          player: roomData.player,
          isHost: roomData.isHost
        }));

        console.log(`🏠 Sala ONLINE creada exitosamente: ${roomData.roomCode}`);
        console.log(`✅ Sala creada: ${roomData.roomCode}`);
        setRoomCode(roomData.roomCode);
        
      } catch (error) {
        console.error('❌ Error creando sala en backend:', error.message);
        showCustomModal('❌ Error', 'No se pudo crear la sala online. Continuando en modo local.', 'error');
        // Continuar con código local si falla el backend
        generateRoomCode();
      } finally {
        setIsCreatingRoom(false);
      }
    } else {
      // Modo local para un dispositivo o sin backend
      console.log('⚠️ Creando sala LOCAL para un dispositivo');
      generateRoomCode();
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      // Sincronizar estado de mute cuando regresamos a la pantalla
      setIsMuted(audioService.isMusicMuted);
      
      // Crear sala (backend o local según configuración)
      handleCreateRoom();
      
      // SOLO configurar jugadores si NO se está uniendo a una sala existente
      if (!isJoining) {
        // Configurar jugadores para modo single device
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
          // Para modo multiplayer creando sala nueva, usar datos del jugador registrado
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
      } else {
        // Si se está uniendo, los jugadores se configuran en handleCreateRoom()
        console.log('🔗 Jugador uniéndose - esperando datos del backend...');
      }
      
      // Animaciones de entrada
      startEntranceAnimations();
      
      return () => {
        // audioService gestiona automáticamente la limpieza
      };
    }, [])
  );

  // Escuchar eventos de Socket.IO para jugadores que se unen/salen
  useEffect(() => {
    if (!connected) return;

    const handlePlayerJoined = (data) => {
      console.log('👤 Nuevo jugador se unió:', data.player.nickname);
      const newPlayer = {
        id: data.player.id,
        name: data.player.nickname,
        nickname: data.player.nickname,
        emoji: data.player.emoji || '😄',
        avatar: data.player.photoUri,
        isHost: false,
        isCurrentUser: false,
        gender: data.player.gender,
        orientation: data.player.orientation
      };
      
      setConnectedPlayers(prev => {
        // Evitar duplicados
        const exists = prev.find(p => p.id === newPlayer.id);
        if (exists) return prev;
        return [...prev, newPlayer];
      });
    };

    const handlePlayerLeft = (data) => {
      console.log('👋 Jugador salió:', data.player.nickname);
      setConnectedPlayers(prev => prev.filter(p => p.id !== data.player.id));
    };

    const handlePlayerUpdated = (data) => {
      console.log('📝 Información de jugador actualizada:', data.player.nickname);
      setConnectedPlayers(prev => prev.map(player => {
        if (player.id === data.player.id) {
          return {
            ...player,
            name: data.player.nickname,
            nickname: data.player.nickname,
            emoji: data.player.emoji || player.emoji,
            avatar: data.player.photoUri || player.avatar,
            gender: data.player.gender || player.gender,
            orientation: data.player.orientation || player.orientation
          };
        }
        return player;
      }));
    };

    const handleRoomSync = (data) => {
      console.log('🔄 *** EVENTO ROOMSYNC RECIBIDO ***');
      console.log('🔄 Sincronizando lista de jugadores:', data.room.players?.length || 0);
      console.log('🔄 Socket ID actual en sync:', SocketService.socket?.id);
      console.log('🔄 DEBUG - data completo:', JSON.stringify(data, null, 2));
      
      if (data.room && data.room.players) {
        const allPlayers = data.room.players.map(player => {
          const isCurrentUser = player.socketId === SocketService.socket?.id;
          console.log(`🔄 Sync - Jugador: ${player.nickname}, socketId: ${player.socketId}, isHost: ${player.isHost}, isCurrentUser: ${isCurrentUser}`);
          
          return {
            id: player.id,
            name: player.nickname,
            nickname: player.nickname,
            emoji: player.emoji || '😄',
            avatar: player.photoUri || player.avatar,
            photoUri: player.photoUri,
            photo: player.photo,
            isHost: player.isHost, // Usar directamente del backend
            isCurrentUser: isCurrentUser,
            gender: player.gender,
            orientation: player.orientation
          };
        });
        
        setConnectedPlayers(allPlayers);
        console.log('🔄 Jugadores sincronizados:', allPlayers.map(p => `${p.nickname}(${p.isHost ? 'HOST' : 'PLAYER'}, current: ${p.isCurrentUser})`));
        console.log('🔄 Total jugadores mostrados:', allPlayers.length);
      }
    };

    const handleKicked = (data) => {
      console.log('🔔 *** EVENTO KICKED RECIBIDO ***');
      console.log('❌ Jugador expulsado porque host disolvió la sala:', data);
      console.log('📱 Mostrando modal de sala disuelta...');

      // Mostrar modal personalizado al jugador expulsado
      setShowKickedModal(true);

      // Animar entrada del modal
      Animated.timing(kickedModalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };
    
    const handlePlayerKicked = (data) => {
      console.log('🔔 *** EVENTO PLAYERKICKED RECIBIDO ***');
      console.log('❌ Jugador expulsado individualmente:', data);
      console.log('📱 Mostrando modal de expulsión individual...');

      // Mostrar modal personalizado al jugador expulsado
      setShowKickedModal(true);

      // Animar entrada del modal
      Animated.timing(kickedModalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };

    // Registrar event listeners
    console.log('📡 Registrando event listeners de Socket.IO...');
    SocketService.on('playerJoined', handlePlayerJoined);
    SocketService.on('playerLeft', handlePlayerLeft);
    SocketService.on('playerUpdated', handlePlayerUpdated);
    SocketService.on('roomSync', handleRoomSync);
    SocketService.on('kicked', handleKicked);
    SocketService.on('playerKicked', handlePlayerKicked);
    console.log('✅ Event listeners registrados');

    // Solicitar sincronización inicial
    if (SocketService.connected && !isJoining) {
      console.log('📡 Solicitando sincronización inicial de la sala...');
      SocketService.socket.emit('syncRoom');
    }

    // Cleanup
    return () => {
      SocketService.off('playerJoined', handlePlayerJoined);
      SocketService.off('playerLeft', handlePlayerLeft);
      SocketService.off('playerUpdated', handlePlayerUpdated);
      SocketService.off('roomSync', handleRoomSync);
      SocketService.off('kicked', handleKicked);
      SocketService.off('playerKicked', handlePlayerKicked);
      
      // Cancelar timeouts pendientes
      cancelAutoSync();
    };
  }, [connected, isJoining]);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomCode(result);
  };

  // audioService gestiona automáticamente la limpieza de sonidos
  // No necesitamos cleanupSound manual

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
    // audioService gestiona automáticamente la limpieza, no necesitamos guardar referencia
    await audioService.playSoundEffect(
      require('../../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );
    console.log('🍺 Reproduciendo sonido de lata de cerveza...');
  };

  const playWinePopSound = async () => {
    await audioService.playSoundEffect(
      require('../../../assets/sounds/wine-pop.mp3'),
      { volume: 0.8 }
    );
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

  const handleGoBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    // Si el jugador se unió a una sala (no es host), mostrar modal de jugador
    if (isJoining && !isHost) {
      setShowLeaveModal(true);

      // Animar entrada del modal
      Animated.timing(leaveModalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (isHost && !isJoining) {
      // Si es host y creó la sala, mostrar modal de host
      setShowHostLeaveModal(true);

      // Animar entrada del modal de host
      Animated.timing(hostLeaveModalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Para otros casos, comportamiento normal
      navigation.goBack();
    }
  };

  const handleCloseLeaveModal = () => {
    // Animar salida del modal
    Animated.timing(leaveModalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLeaveModal(false);
    });
  };

  const handleConfirmLeave = async () => {
    try {
      console.log('🚪 Jugador saliendo de la sala...');
      
      // Cerrar modal primero
      handleCloseLeaveModal();
      
      // Verificar si está en modo online o local
      const isLocalMode = playMethod === 'single' || !SocketService.connected;
      
      if (!isLocalMode) {
        // Solo para modo online
        // Limpiar listeners de eventos para evitar conflictos
        SocketService.off('playerJoined');
        SocketService.off('playerLeft');
        SocketService.off('roomSync');
        
        // Salir de la sala en el backend
        if (SocketService.connected) {
          await SocketService.leaveRoom();
          console.log('✅ Jugador salió de la sala exitosamente');
        }
      } else {
        console.log('📱 Saliendo en modo local - no requiere backend');
      }
      
      // Feedback háptico de salida
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptics not available:', error);
      }
      
      // Navegar según el modo
      if (isLocalMode) {
        // En modo local, navegar al menú principal
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainMenu' }],
        });
      } else {
        // En modo online, navegar a JoinGame
        navigation.reset({
          index: 0,
          routes: [{ name: 'JoinGame' }],
        });
      }
      
    } catch (error) {
      console.error('❌ Error saliendo de la sala:', error);
      // Aún así navegar para evitar que el jugador quede atrapado
      const isLocalMode = playMethod === 'single' || !SocketService.connected;
      navigation.reset({
        index: 0,
        routes: [{ name: isLocalMode ? 'MainMenu' : 'JoinGame' }],
      });
    }
  };

  const handleCloseHostLeaveModal = () => {
    // Animar salida del modal de host
    Animated.timing(hostLeaveModalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowHostLeaveModal(false);
    });
  };

  const handleConfirmHostLeave = async () => {
    try {
      console.log('👑 Host disolviendo la sala...');
      
      // Cerrar modal primero
      handleCloseHostLeaveModal();
      
      // Esperar a que termine la animación del modal
      setTimeout(async () => {
        try {
          // Verificar si está en modo online o local
          const isLocalMode = playMethod === 'single' || !SocketService.connected;
          
          if (!isLocalMode) {
            // Solo para modo online
            // Limpiar listeners de eventos para evitar conflictos
            SocketService.off('playerJoined');
            SocketService.off('playerLeft');
            SocketService.off('roomSync');
            
            // Salir de la sala en el backend (esto automáticamente expulsará a todos los jugadores)
            if (SocketService.connected) {
              await SocketService.leaveRoom();
              console.log('✅ Host salió y sala disuelta exitosamente');
            }
          } else {
            console.log('📱 Disolviendo sala en modo local - no requiere backend');
          }
          
          // Feedback háptico de confirmación
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } catch (error) {
            console.log('Haptics not available:', error);
          }
          
          // Navegar según el modo
          if (isLocalMode) {
            // En modo local, navegar al menú principal
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainMenu' }],
            });
          } else {
            // En modo online, también navegar al menú principal después de disolver la sala
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainMenu' }],
            });
          }
          
        } catch (error) {
          console.error('❌ Error disolviendo la sala:', error);
          // Aún así navegar para evitar que el host quede atrapado
          const isLocalMode = playMethod === 'single' || !SocketService.connected;
          if (isLocalMode) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainMenu' }],
            });
          } else {
            // En caso de error, también navegar al menú principal
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainMenu' }],
            });
          }
        }
      }, 300); // Esperar 300ms para que termine la animación
      
    } catch (error) {
      console.error('❌ Error en handleConfirmHostLeave:', error);
    }
  };

  const handleCloseKickedModal = () => {
    // Animar salida del modal de kicked
    Animated.timing(kickedModalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowKickedModal(false);
    });
  };

  const handleConfirmKicked = async () => {
    try {
      console.log('✅ Usuario confirmó modal de expulsión, navegando a MainMenu...');
      
      // Cerrar modal primero
      handleCloseKickedModal();
      
      // Esperar a que termine la animación del modal
      setTimeout(() => {
        // Navegar al MainMenu
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainMenu' }],
        });
      }, 300);
      
    } catch (error) {
      console.error('❌ Error en handleConfirmKicked:', error);
      // Aún así navegar para evitar que el jugador quede atrapado
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainMenu' }],
      });
    }
  };

  const handleKickPlayer = (playerId) => {
    if (!isHost || playerId === currentUserId) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    // Encontrar el jugador a expulsar
    const player = connectedPlayers.find(p => p.id === playerId);
    if (player) {
      setPlayerToKick(player);
      setShowKickPlayerModal(true);

      // Animar entrada del modal
      Animated.timing(kickPlayerModalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };
  
  // Funciones para modal de expulsión de jugador
  const handleCloseKickPlayerModal = () => {
    Animated.timing(kickPlayerModalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowKickPlayerModal(false);
      setPlayerToKick(null);
    });
  };
  
  const handleConfirmKickPlayer = async () => {
    if (playerToKick) {
      // Cerrar modal primero
      handleCloseKickPlayerModal();
      
      // Expulsar jugador según el modo (local vs online)
      setTimeout(async () => {
        try {
          console.log(`📡 Expulsando jugador: ${playerToKick.nickname} (${playerToKick.id})`);
          
          // Verificar si estamos en modo local o online
          const isLocalMode = playMethod === 'single' || !SocketService.connected;
          
          if (isLocalMode) {
            // MODO LOCAL - Expulsión directa sin backend
            console.log('📱 Expulsando jugador en modo local');
            
            // Remover jugador de la lista local
            setConnectedPlayers(prev => {
              const updatedPlayers = prev.filter(p => p.id !== playerToKick.id);
              console.log(`✅ Jugador ${playerToKick.nickname} expulsado localmente`);
              console.log(`👥 Jugadores restantes: ${updatedPlayers.length}`);
              return updatedPlayers;
            });
            
            // Mostrar confirmación al host
            showCustomModal('✅ Expulsado', `${playerToKick.nickname} ha sido expulsado de la partida.`, 'success');
            
          } else {
            // MODO ONLINE - Usar backend para expulsar
            console.log('🌐 Expulsando jugador en modo online');
            
            if (SocketService.connected) {
              const response = await new Promise((resolve, reject) => {
                SocketService.socket.emit('kickPlayer', 
                  { targetPlayerId: playerToKick.id }, 
                  (response) => {
                    if (response && response.success) {
                      resolve(response);
                    } else {
                      reject(new Error(response?.error || 'Failed to kick player'));
                    }
                  }
                );
              });
              
              console.log('✅ Jugador expulsado exitosamente:', response.message);
              
              // Cancelar sincronizaciones automáticas para evitar errores
              cancelAutoSync();
              
              // Actualizar lista local con datos del backend
              if (response.room && response.room.players) {
                const updatedPlayers = response.room.players.map(player => ({
                  ...player,
                  isCurrentUser: player.socketId === SocketService.socket?.id
                }));
                setConnectedPlayers(updatedPlayers);
              }
            } else {
              throw new Error('No hay conexión al servidor');
            }
          }
          
          playWinePopSound();
          
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } catch (error) {
            console.log('Haptics not available:', error);
          }
          
        } catch (error) {
          console.error('❌ Error expulsando jugador:', error);
          // Mostrar error al host
          showCustomModal('❌ Error', 'No se pudo expulsar al jugador. Inténtalo de nuevo.', 'error');
        }
      }, 300);
    }
  };

  const handleCopyRoomCode = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    // Mock clipboard functionality
    showCustomModal('📋 Copiado', 'Código de sala copiado al portapapeles', 'success');
    playWinePopSound();
  };

  const handleStartGame = () => {
    if (!isHost) {
      showCustomModal('❌ Sin permisos', 'Solo el host puede iniciar la partida.', 'error');
      return;
    }

    if (connectedPlayers.length < 2) {
      showCustomModal('⚠️ Jugadores Insuficientes', 'Necesitas al menos 2 jugadores para iniciar el juego.', 'info');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playBeerSound();

    console.log('🎮 Host iniciando partida con jugadores:', connectedPlayers.map(p => p.nickname));

    if (gameMode === 'single-device') {
      // Limpiar Redux ANTES de iniciar nueva partida para evitar jugadores de partidas anteriores
      console.log('🧹 Limpiando Redux antes de iniciar nueva partida');
      dispatch(clearAllPlayers());
      dispatch(resetGame());

      // Para modo single-device, navegar a GameScreen
      console.log('🎮 Navegando a GameScreen para modo single-device');
      navigation.navigate('GameScreen', {
        gameMode,
        playerCount: connectedPlayers.length,
        registeredPlayers: connectedPlayers
      });
    } else {
      // Para modo multijugador, mostrar mensaje de éxito (funcionalidad futura)
      showCustomModal('🎮 ¡Iniciando Juego!', `${connectedPlayers.length} jugadores listos para jugar`, 'success');
    }
  };

  const canStartGame = isHost && connectedPlayers.length >= 2;

  // Generar slots vacíos si es necesario
  // En modo single no mostrar slots vacíos para evitar problemas de distribución vertical
  const maxSlots = playMethod === 'single' ? connectedPlayers.length : 10;
  const emptySlots = Math.max(0, maxSlots - connectedPlayers.length);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Fondo de papel con líneas */}
      <View style={styles.paperBackground}>
        <View style={styles.notebookLines}>
          {[...Array(notebookLineCount)].map((_, index) => (
            <View
              key={index}
              style={[styles.line, { top: notebookLineSpacing + (index * notebookLineSpacing) }]}
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
        style={[
          styles.backButton,
          {
            left: leftOffset,
            top: topOffset + scaleByContent(30, 'spacing'),
          },
        ]}
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
            right: rightOffset,
            top: topOffset + scaleByContent(20, 'spacing'),
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
              {connectedPlayers.map((player, index) => (
                <View key={player.id || `player-${index}`} style={[
                  styles.playerItem,
                  player.isCurrentUser && styles.currentUserItem,
                  playMethod === 'single' && styles.playerItemFixedSafe
                ]}>
                  <View style={[
                    styles.playerAvatar,
                    (player.avatar || player.photoUri) ? styles.playerAvatarWithPhoto : styles.playerAvatarEmoji
                  ]}>
                    {(player.avatar || player.photoUri) ? (
                      <Image 
                        source={{ uri: player.avatar || player.photoUri }} 
                        style={styles.avatarImage}
                        onError={(e) => {
                          console.log('❌ Error cargando imagen:', e.nativeEvent.error);
                          console.log('🔗 URI de imagen:', player.avatar || player.photoUri);
                          console.log('🔍 Jugador completo:', JSON.stringify(player, null, 2));
                        }}
                        onLoad={() => {
                          console.log('✅ Imagen cargada correctamente para:', player.nickname || player.name || 'jugador desconocido');
                        }}
                      />
                    ) : (
                      <Text style={styles.avatarEmoji}>
                        {player.emoji || player.selectedEmoji || '😄'}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.playerInfo}>
                    <View style={styles.playerNameContainer}>
                      <Text style={styles.playerName}>
                        {player.name || player.nickname}
                      </Text>
                      {player.isHost && <Text style={styles.crownEmoji}>👑</Text>}
                      {player.isCurrentUser && <Text style={styles.youIndicator}>(Tú)</Text>}
                    </View>
                    
                    {/* Información adicional del jugador - solo renderizar si hay datos */}
                    {(player.gender || player.orientation) && (
                      <View style={styles.playerDetailsContainer}>
                        {player.gender && (
                          <Text style={styles.playerDetail}>
                            {player.gender === 'man' ? '👨' : player.gender === 'woman' ? '👩' : '🧑'}
                          </Text>
                        )}
                        {player.orientation && (
                          <Text style={styles.playerDetail}>
                            {player.orientation === 'men' ? '💙' : player.orientation === 'women' ? '💗' : '💜'}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  
                  {/* Estado de conexión */}
                  <View style={styles.connectionStatus}>
                    <Text style={styles.connectionDot}>🟢</Text>
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
                  {playMethod === 'multiple' && roomCode ? (
                    <QRCode
                      value={roomCode}
                      size={scaleByContent(110, 'interactive')}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Text style={styles.qrPlaceholderText}>📱</Text>
                      <Text style={styles.qrPlaceholderSubtext}>Código QR</Text>
                    </>
                  )}
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
              
              {/* Botón Iniciar Juego - Solo para Host */}
              {isHost && (
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
              )}
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

      {/* Modal personalizado para confirmación de salida */}
      {showLeaveModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.leaveModalContainer,
                {
                  opacity: leaveModalOpacity,
                },
              ]}
            >
            {/* Fondo con patrón de libreta */}
            <View style={styles.leaveModalPaper}>
              {/* Líneas de libreta en el modal */}
              {[...Array(4)].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.leaveModalLine, { top: 25 + (index * 30) }]} 
                />
              ))}
              
              {/* Línea vertical roja (margen) */}
              <View style={styles.leaveModalRedLine} />
              
              {/* Agujeros de perforación */}
              <View style={styles.leaveModalHoles}>
                {[...Array(3)].map((_, index) => (
                  <View key={index} style={styles.leaveModalHole} />
                ))}
              </View>
              
              {/* Contenido del modal */}
              <View style={styles.leaveModalContent}>
                <Text style={styles.leaveModalTitle}>⚠️ Salir de la Partida</Text>
                <Text style={styles.leaveModalMessage}>
                  Si sales ahora serás eliminado de la sala y de la partida. ¿Estás seguro?
                </Text>
                
                {/* Botones */}
                <View style={styles.leaveModalButtons}>
                  <TouchableOpacity
                    style={[styles.leaveModalButton, styles.leaveModalCancelButton]}
                    onPress={handleCloseLeaveModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.leaveModalCancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.leaveModalButton, styles.leaveModalConfirmButton]}
                    onPress={handleConfirmLeave}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.leaveModalConfirmButtonText}>Salir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>)}

      {/* Modal personalizado para confirmación de disolución de sala (Host) */}
      {showHostLeaveModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.hostLeaveModalContainer,
                {
                  opacity: hostLeaveModalOpacity,
                },
              ]}
            >
            {/* Fondo con patrón de libreta */}
            <View style={styles.hostLeaveModalPaper}>
              {/* Líneas de libreta en el modal */}
              {[...Array(5)].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.hostLeaveModalLine, { top: 30 + (index * 30) }]} 
                />
              ))}
              
              {/* Línea vertical roja (margen) */}
              <View style={styles.hostLeaveModalRedLine} />
              
              {/* Agujeros de perforación */}
              <View style={styles.hostLeaveModalHoles}>
                {[...Array(3)].map((_, index) => (
                  <View key={index} style={styles.hostLeaveModalHole} />
                ))}
              </View>
              
              {/* Contenido del modal */}
              <View style={styles.hostLeaveModalContent}>
                <Text style={styles.hostLeaveModalTitle}>👑 Disolver Sala</Text>
                <Text style={styles.hostLeaveModalMessage}>
                  Si sales ahora se eliminará la sala y se expulsará a todos los jugadores unidos a la partida. ¿Estás seguro?
                </Text>
                
                {/* Botones */}
                <View style={styles.hostLeaveModalButtons}>
                  <TouchableOpacity
                    style={[styles.hostLeaveModalButton, styles.hostLeaveModalCancelButton]}
                    onPress={handleCloseHostLeaveModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hostLeaveModalCancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.hostLeaveModalButton, styles.hostLeaveModalConfirmButton]}
                    onPress={handleConfirmHostLeave}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hostLeaveModalConfirmButtonText}>Disolver</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>)}

      {/* Modal personalizado para notificación de expulsión */}
      {showKickedModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.leaveModalContainer,
                {
                  opacity: kickedModalOpacity,
                  transform: [{ rotate: '1deg' }],
                },
              ]}
            >
            {/* Fondo de papel del modal */}
            <View style={styles.leaveModalPaper}>
              {/* Líneas del cuaderno */}
              {[...Array(12)].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.leaveModalLine, { top: 25 + (index * 20) }]} 
                />
              ))}
              <View style={styles.leaveModalRedLine} />
              <View style={styles.leaveModalHoles}>
                {[...Array(5)].map((_, index) => (
                  <View key={index} style={styles.leaveModalHole} />
                ))}
              </View>
            </View>

            <View style={styles.leaveModalContent}>
              {/* Título del modal */}
              <Text style={styles.leaveModalTitle}>🚫 Has Sido Expulsado</Text>
              
              {/* Mensaje explicativo */}
              <Text style={styles.leaveModalMessage}>
                El host te ha expulsado de la sala.{'\n'}{'\n'}
                Serás redirigido al menú principal.
              </Text>
              
              {/* Botón de confirmación */}
              <View style={styles.leaveModalButtons}>
                <TouchableOpacity
                  style={[styles.leaveModalButton, { backgroundColor: '#4CAF50', transform: [{ rotate: '-0.5deg' }] }]}
                  onPress={handleConfirmKicked}
                  activeOpacity={0.8}
                >
                  <Text style={styles.leaveModalConfirmButtonText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>)}

      {/* Modal personalizado para expulsión de jugador */}
      {showKickPlayerModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.leaveModalContainer,
                {
                  opacity: kickPlayerModalOpacity,
                }
              ]}
            >
            {/* Fondo de papel del modal */}
            <View style={styles.leaveModalPaper}>
              <View style={styles.leaveModalHoles}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.leaveModalHole} />
                ))}
              </View>
              <View style={styles.leaveModalRedLine} />
              {/* Líneas de libreta */}
              {[...Array(6)].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.leaveModalLine, { top: 25 + (index * 25) }]} 
                />
              ))}
            </View>

            <View style={styles.leaveModalContent}>
              <Text style={styles.leaveModalTitle}>⚠️ Expulsar Jugador</Text>
              <Text style={styles.leaveModalMessage}>
                ¿Estás seguro de que quieres expulsar a {playerToKick?.nickname || 'este jugador'}?{'\n'}{'\n'}
                Esta acción no se puede deshacer.
              </Text>

              {/* Botones */}
              <View style={styles.leaveModalButtons}>
                <TouchableOpacity
                  style={[styles.leaveModalButton, styles.leaveModalCancelButton]}
                  onPress={handleCloseKickPlayerModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.leaveModalCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.leaveModalButton, styles.leaveModalConfirmButton]}
                  onPress={handleConfirmKickPlayer}
                  activeOpacity={0.8}
                >
                  <Text style={styles.leaveModalConfirmButtonText}>Expulsar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>)}

      {/* Modal genérico personalizado para errores */}
      {showErrorModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.leaveModalContainer,
                {
                  opacity: genericModalOpacity,
                }
              ]}
            >
            {/* Fondo de papel del modal */}
            <View style={styles.leaveModalPaper}>
              <View style={styles.leaveModalHoles}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.leaveModalHole} />
                ))}
              </View>
              <View style={styles.leaveModalRedLine} />
              {/* Líneas de libreta */}
              {[...Array(8)].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.leaveModalLine, { top: 25 + (index * 25) }]} 
                />
              ))}
            </View>

            <View style={styles.leaveModalContent}>
              <Text style={styles.leaveModalTitle}>{modalData.title}</Text>
              <Text style={styles.leaveModalMessage}>
                {modalData.message}
              </Text>
              
              {/* Botón */}
              <View style={styles.leaveModalButtons}>
                <TouchableOpacity
                  style={[styles.leaveModalButton, { backgroundColor: '#FF6B6B', transform: [{ rotate: '-0.5deg' }] }]}
                  onPress={handleCloseGenericModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.leaveModalConfirmButtonText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>)}

      {/* Modal genérico personalizado para éxitos */}
      {showSuccessModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.leaveModalContainer,
                {
                  opacity: genericModalOpacity,
                }
              ]}
            >
            {/* Fondo de papel del modal */}
            <View style={styles.leaveModalPaper}>
              <View style={styles.leaveModalHoles}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.leaveModalHole} />
                ))}
              </View>
              <View style={styles.leaveModalRedLine} />
              {/* Líneas de libreta */}
              {[...Array(8)].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.leaveModalLine, { top: 25 + (index * 25) }]} 
                />
              ))}
            </View>

            <View style={styles.leaveModalContent}>
              <Text style={styles.leaveModalTitle}>{modalData.title}</Text>
              <Text style={styles.leaveModalMessage}>
                {modalData.message}
              </Text>
              
              {/* Botón */}
              <View style={styles.leaveModalButtons}>
                <TouchableOpacity
                  style={[styles.leaveModalButton, { backgroundColor: '#4CAF50', transform: [{ rotate: '0.5deg' }] }]}
                  onPress={handleCloseGenericModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.leaveModalConfirmButtonText}>¡Genial!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>)}

      {/* Modal genérico personalizado para información */}
      {showInfoModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.leaveModalContainer,
                {
                  opacity: genericModalOpacity,
                }
              ]}
            >
            {/* Fondo de papel del modal */}
            <View style={styles.leaveModalPaper}>
              <View style={styles.leaveModalHoles}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.leaveModalHole} />
                ))}
              </View>
              <View style={styles.leaveModalRedLine} />
              {/* Líneas de libreta */}
              {[...Array(8)].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.leaveModalLine, { top: 25 + (index * 25) }]} 
                />
              ))}
            </View>

            <View style={styles.leaveModalContent}>
              <Text style={styles.leaveModalTitle}>{modalData.title}</Text>
              <Text style={styles.leaveModalMessage}>
                {modalData.message}
              </Text>
              
              {/* Botón */}
              <View style={styles.leaveModalButtons}>
                <TouchableOpacity
                  style={[styles.leaveModalButton, { backgroundColor: '#2196F3', transform: [{ rotate: '-0.3deg' }] }]}
                  onPress={handleCloseGenericModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.leaveModalConfirmButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>)}
    </Animated.View>
  );
};

// Obtener información del dispositivo para estilos dinámicos
const { width: _rw, height: _rh } = Dimensions.get('window');
const width = Math.max(_rw, _rh);
const height = Math.min(_rw, _rh);
const deviceType = getDeviceType();
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const notebookLineSpacing = isTabletScreen ? 15 : scaleByContent(25, 'spacing');
const notebookLineCount = Math.ceil(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / notebookLineSpacing) + 2;

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
    height: scaleByContent(1, 'spacing'),
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
  
  // Botón de regreso
  backButton: {
    position: 'absolute',
    top: scaleByContent(isTabletScreen ? 50 : 35, 'spacing'),
    left: scaleByContent(isTabletScreen ? 40 : 25, 'spacing'),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scaleByContent(15, 'spacing'),
    paddingVertical: scaleByContent(8, 'spacing'),
    borderRadius: scaleByContent(12, 'spacing'),
    borderTopLeftRadius: scaleByContent(4, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(3, 'spacing'),
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
    zIndex: 10,
  },
  
  backButtonText: {
    fontSize: scaleByContent(isTabletScreen ? 20 : 14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },

  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: scaleByContent(isTabletScreen ? 85 : 60, 'spacing'),
    paddingBottom: scaleByContent(20, 'spacing'),
    paddingHorizontal: scaleByContent(120, 'spacing'),
  },
  
  // Lado izquierdo - 70% del ancho
  leftSide: {
    flex: 0.7,
    paddingRight: scaleByContent(20, 'spacing'),
    paddingLeft: scaleByContent(20, 'spacing'),
  },
  
  roomTitle: {
    fontSize: scaleByContent(28, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
    transform: [{ rotate: '1deg' }],
  },
  
  statusContainer: {
    backgroundColor: theme.colors.postItYellow,
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    borderRadius: scaleByContent(15, 'spacing'),
    borderTopLeftRadius: scaleByContent(5, 'spacing'),
    paddingVertical: scaleByContent(12, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
    marginBottom: scaleByContent(15, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(6, 'spacing'),
    elevation: 6,
    transform: [{ rotate: '-0.5deg' }],
  },
  
  statusText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    textAlign: 'center',
  },
  
  playersListContainer: {
    flex: 1,
  },
  
  playersListTitle: {
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: scaleByContent(10, 'spacing'),
    transform: [{ rotate: '0.3deg' }],
  },
  
  playersScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    borderRadius: scaleByContent(12, 'spacing'),
    borderTopLeftRadius: scaleByContent(3, 'spacing'),
    paddingVertical: scaleByContent(8, 'spacing'),
    paddingHorizontal: scaleByContent(12, 'spacing'),
    marginBottom: scaleByContent(8, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.15,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
    transform: [{ rotate: '-0.2deg' }],
    position: 'relative',
  },
  
  playerItemFixed: {
    minHeight: scaleByContent(60, 'interactive'),
    maxHeight: scaleByContent(60, 'interactive'),
    overflow: 'visible',
  },
  
  playerItemFixedSafe: {
    minHeight: scaleByContent(56, 'interactive'),
    overflow: 'visible',
  },
  
  playerAvatar: {
    width: scaleByContent(isTabletScreen ? 32 : 40, 'interactive'),
    height: scaleByContent(isTabletScreen ? 32 : 40, 'interactive'),
    borderRadius: scaleByContent(isTabletScreen ? 16 : 20, 'spacing'),
    backgroundColor: theme.colors.postItPink,
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleByContent(10, 'spacing'),
  },
  
  playerAvatarWithPhoto: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  
  playerAvatarEmoji: {
    backgroundColor: theme.colors.postItYellow,
  },
  
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: scaleByContent(20, 'spacing'),
  },
  
  avatarEmoji: {
    fontSize: scaleByContent(isTabletScreen ? 16 : 20, 'icon'),
  },
  
  playerInfo: {
    flex: 1,
  },
  
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  playerName: {
    fontSize: scaleByContent(isTabletScreen ? 14 : 16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  crownEmoji: {
    fontSize: scaleByContent(isTabletScreen ? 14 : 18, 'icon'),
    marginLeft: scaleByContent(5, 'spacing'),
  },
  
  youIndicator: {
    fontSize: scaleByContent(isTabletScreen ? 11 : 14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    marginLeft: scaleByContent(5, 'spacing'),
    fontStyle: 'italic',
  },
  
  currentUserItem: {
    borderColor: theme.colors.postItGreen,
    borderWidth: scaleByContent(3, 'spacing'),
    backgroundColor: '#F0FDF4',
  },
  
  playerDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleByContent(2, 'spacing'),
  },
  
  playerDetail: {
    fontSize: scaleByContent(isTabletScreen ? 10 : 12, 'text'),
    marginRight: scaleByContent(5, 'spacing'),
  },
  
  connectionStatus: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scaleByContent(5, 'spacing'),
  },
  
  connectionDot: {
    fontSize: scaleByContent(isTabletScreen ? 6 : 8, 'icon'),
  },
  
  kickButton: {
    padding: scaleByContent(8, 'interactive'),
    position: 'absolute',
    right: scaleByContent(8, 'spacing'),
    top: '50%',
    transform: [{ translateY: -scaleByContent(12, 'interactive') }],
  },
  
  kickButtonText: {
    fontSize: scaleByContent(isTabletScreen ? 14 : 18, 'icon'),
  },
  
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    borderRadius: scaleByContent(12, 'spacing'),
    borderTopLeftRadius: scaleByContent(3, 'spacing'),
    paddingVertical: scaleByContent(10, 'spacing'),
    paddingHorizontal: scaleByContent(12, 'spacing'),
    marginBottom: scaleByContent(8, 'spacing'),
    opacity: 0.7,
    transform: [{ rotate: '0.1deg' }],
  },
  
  emptyAvatar: {
    width: scaleByContent(40, 'interactive'),
    height: scaleByContent(40, 'interactive'),
    borderRadius: scaleByContent(20, 'spacing'),
    backgroundColor: '#E0E0E0',
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleByContent(10, 'spacing'),
  },
  
  emptyAvatarText: {
    fontSize: scaleByContent(20, 'icon'),
    color: '#999999',
  },
  
  emptySlotText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#999999',
    fontStyle: 'italic',
  },
  
  // Lado derecho - 30% del ancho
  rightSide: {
    flex: 0.3,
    paddingLeft: scaleByContent(20, 'spacing'),
    borderLeftWidth: scaleByContent(2, 'spacing'),
    borderLeftColor: '#A8C8EC',
    borderLeftStyle: 'dashed',
    alignItems: 'center',
  },
  
  shareTitle: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(20, 'spacing'),
    transform: [{ rotate: '-0.5deg' }],
  },
  
  qrContainer: {
    marginBottom: scaleByContent(20, 'spacing'),
  },
  
  qrPlaceholder: {
    width: scaleByContent(140, 'interactive'),
    height: scaleByContent(140, 'interactive'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    borderRadius: scaleByContent(15, 'spacing'),
    borderTopLeftRadius: scaleByContent(5, 'spacing'),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(6, 'spacing'),
    elevation: 6,
    transform: [{ rotate: '2deg' }],
  },
  
  qrPlaceholderText: {
    fontSize: scaleByContent(40, 'icon'),
    marginBottom: scaleByContent(5, 'spacing'),
  },
  
  qrPlaceholderSubtext: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
  },
  
  roomCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.postItBlue,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    borderTopLeftRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    transform: [{ rotate: '-1deg' }],
    minHeight: 32,
    maxHeight: 32,
    width: '100%',
  },
  
  roomCodeLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    lineHeight: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  
  roomCodeText: {
    fontSize: 14,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    letterSpacing: 0.5,
    lineHeight: 18,
    textAlign: 'center',
    textAlignVertical: 'center',
    flex: 1,
  },
  
  copyButton: {
    padding: scaleByContent(5, 'interactive'),
  },
  
  copyButtonText: {
    fontSize: scaleByContent(16, 'icon'),
  },
  
  instructionText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    lineHeight: scaleByContent(16, 'text'),
  },
  
  singleDeviceInfo: {
    alignItems: 'center',
    paddingTop: scaleByContent(40, 'spacing'),
  },
  
  singleDeviceTitle: {
    fontSize: scaleByContent(22, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: scaleByContent(10, 'spacing'),
    transform: [{ rotate: '1deg' }],
  },
  
  singleDeviceSubtitle: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: scaleByContent(20, 'spacing'),
  },
  
  singleDeviceDescription: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    lineHeight: scaleByContent(20, 'text'),
    paddingHorizontal: scaleByContent(10, 'spacing'),
  },
  
  // Botón iniciar juego
  startGameButtonContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  
  startGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 18,
    borderTopLeftRadius: 5,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    transform: [{ rotate: '-1.5deg' }],
    minWidth: 150,
  },
  
  startGameButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    textAlign: 'center',
    marginRight: 6,
  },
  
  startGameButtonIcon: {
    fontSize: 18,
  },
  
  // Estilos para el botón de mute
  sketchMuteButton: {
    position: 'absolute',
    top: 30,
    right: 25,
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
    height: scaleByContent(3, 'spacing'),
    borderRadius: scaleByContent(2, 'spacing'),
    transform: [{ rotate: '45deg' }],
  },

  // Estilos del modal de confirmación de salida
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
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(50, 'spacing'),
  },

  leaveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(50, 'spacing'),
  },
  
  leaveModalContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: scaleByContent(25, 'spacing'),
    padding: scaleByContent(20, 'spacing'),
    maxWidth: scaleByContent(500, 'interactive'),
    width: '90%',
    minHeight: scaleByContent(280, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleByContent(10, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(20, 'spacing'),
    elevation: 20,
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    borderTopLeftRadius: scaleByContent(5, 'spacing'),
    transform: [{ rotate: '-1deg' }],
    overflow: 'hidden',
  },
  
  leaveModalPaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F6F0',
  },
  
  leaveModalLine: {
    position: 'absolute',
    left: scaleByContent(45, 'spacing'),
    right: scaleByContent(15, 'spacing'),
    height: scaleByContent(1, 'spacing'),
    backgroundColor: '#A8C8EC',
    opacity: 0.4,
  },
  
  leaveModalRedLine: {
    position: 'absolute',
    left: scaleByContent(40, 'spacing'),
    top: scaleByContent(15, 'spacing'),
    bottom: scaleByContent(15, 'spacing'),
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },
  
  leaveModalHoles: {
    position: 'absolute',
    left: scaleByContent(15, 'spacing'),
    top: scaleByContent(40, 'spacing'),
    bottom: scaleByContent(40, 'spacing'),
    width: scaleByContent(15, 'spacing'),
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  leaveModalHole: {
    width: scaleByContent(12, 'spacing'),
    height: scaleByContent(12, 'spacing'),
    borderRadius: scaleByContent(6, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(1, 'spacing'),
    borderColor: '#D0D0D0',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(1, 'spacing'), height: scaleByContent(1, 'spacing') },
    shadowOpacity: 0.2,
    shadowRadius: scaleByContent(2, 'spacing'),
    elevation: 2,
  },
  
  leaveModalContent: {
    paddingLeft: scaleByContent(55, 'spacing'),
    paddingRight: scaleByContent(25, 'spacing'),
    paddingTop: scaleByContent(30, 'spacing'),
    paddingBottom: scaleByContent(25, 'spacing'),
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  
  leaveModalTitle: {
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
    transform: [{ rotate: '0.5deg' }],
  },
  
  leaveModalMessage: {
    fontSize: scaleByContent(15, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    textAlign: 'center',
    lineHeight: scaleByContent(22, 'text'),
    marginBottom: scaleByContent(30, 'spacing'),
    paddingHorizontal: scaleByContent(10, 'spacing'),
  },
  
  leaveModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: scaleByContent(15, 'spacing'),
  },
  
  leaveModalButton: {
    flex: 1,
    paddingVertical: scaleByContent(12, 'interactive'),
    paddingHorizontal: scaleByContent(20, 'interactive'),
    borderRadius: scaleByContent(12, 'spacing'),
    borderTopLeftRadius: scaleByContent(3, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.2,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
    minHeight: scaleByContent(45, 'interactive'),
  },
  
  leaveModalCancelButton: {
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '0.5deg' }],
  },
  
  leaveModalConfirmButton: {
    backgroundColor: '#FF6B6B',
    transform: [{ rotate: '-0.5deg' }],
  },
  
  leaveModalCancelButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  leaveModalConfirmButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },

  // Estilos del modal de confirmación para host (disolución de sala)
  hostLeaveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(25, 'spacing'),
    paddingVertical: scaleByContent(40, 'spacing'),
  },
  
  hostLeaveModalContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: scaleByContent(25, 'spacing'),
    padding: scaleByContent(20, 'spacing'),
    maxWidth: scaleByContent(520, 'interactive'),
    width: '92%',
    minHeight: scaleByContent(320, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleByContent(15, 'spacing') },
    shadowOpacity: 0.4,
    shadowRadius: scaleByContent(25, 'spacing'),
    elevation: 25,
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    borderTopLeftRadius: scaleByContent(5, 'spacing'),
    transform: [{ rotate: '-0.8deg' }],
    overflow: 'hidden',
  },
  
  hostLeaveModalPaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F6F0',
  },
  
  hostLeaveModalLine: {
    position: 'absolute',
    left: scaleByContent(50, 'spacing'),
    right: scaleByContent(15, 'spacing'),
    height: scaleByContent(1, 'spacing'),
    backgroundColor: '#A8C8EC',
    opacity: 0.5,
  },
  
  hostLeaveModalRedLine: {
    position: 'absolute',
    left: scaleByContent(45, 'spacing'),
    top: scaleByContent(15, 'spacing'),
    bottom: scaleByContent(15, 'spacing'),
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
    opacity: 0.6,
  },
  
  hostLeaveModalHoles: {
    position: 'absolute',
    left: scaleByContent(15, 'spacing'),
    top: scaleByContent(50, 'spacing'),
    bottom: scaleByContent(50, 'spacing'),
    width: scaleByContent(18, 'spacing'),
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  hostLeaveModalHole: {
    width: scaleByContent(14, 'spacing'),
    height: scaleByContent(14, 'spacing'),
    borderRadius: scaleByContent(7, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(1.5, 'spacing'),
    borderColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(1, 'spacing'), height: scaleByContent(1, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(3, 'spacing'),
    elevation: 3,
  },
  
  hostLeaveModalContent: {
    paddingLeft: scaleByContent(60, 'spacing'),
    paddingRight: scaleByContent(25, 'spacing'),
    paddingTop: scaleByContent(35, 'spacing'),
    paddingBottom: scaleByContent(30, 'spacing'),
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  
  hostLeaveModalTitle: {
    fontSize: scaleByContent(22, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(18, 'spacing'),
    transform: [{ rotate: '0.3deg' }],
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: scaleByContent(1, 'spacing'), height: scaleByContent(1, 'spacing') },
    textShadowRadius: scaleByContent(2, 'spacing'),
  },
  
  hostLeaveModalMessage: {
    fontSize: scaleByContent(15, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    textAlign: 'center',
    lineHeight: scaleByContent(24, 'text'),
    marginBottom: scaleByContent(35, 'spacing'),
    paddingHorizontal: scaleByContent(5, 'spacing'),
  },
  
  hostLeaveModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: scaleByContent(18, 'spacing'),
  },
  
  hostLeaveModalButton: {
    flex: 1,
    paddingVertical: scaleByContent(14, 'interactive'),
    paddingHorizontal: scaleByContent(20, 'interactive'),
    borderRadius: scaleByContent(15, 'spacing'),
    borderTopLeftRadius: scaleByContent(4, 'spacing'),
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(5, 'spacing'),
    elevation: 5,
    minHeight: scaleByContent(50, 'interactive'),
  },
  
  hostLeaveModalCancelButton: {
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '0.8deg' }],
  },
  
  hostLeaveModalConfirmButton: {
    backgroundColor: '#FF4444',
    transform: [{ rotate: '-0.8deg' }],
  },
  
  hostLeaveModalCancelButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  hostLeaveModalConfirmButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
});

export default CreateLobbyScreen;