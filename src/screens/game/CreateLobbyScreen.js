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
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../../styles/theme';
import { useSocket, useRoom } from '../../hooks/useSocket';
import { setRoomData } from '../../store/connectionSlice';
import SocketService from '../../services/SocketService';
import { 
  scale, 
  scaleWidth, 
  scaleHeight, 
  scaleText, 
  scaleModerate,
  getDeviceType,
  isSmallDevice,
  isTablet,
  RESPONSIVE,
  getDeviceInfo 
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
    Animated.parallel([
      Animated.spring(genericModalScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(genericModalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Función para cerrar modales genéricos
  const handleCloseGenericModal = () => {
    Animated.parallel([
      Animated.timing(genericModalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(genericModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
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
    
    // Solo crear sala en backend si la conexión es WiFi y está conectado
    if (connectionType === 'wifi' && (connected || isConnected)) {
      try {
        setIsCreatingRoom(true);
        console.log('🏠 Creando sala en backend...');
        
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

        console.log(`🏠 Sala creada exitosamente: ${roomData.roomCode}`);
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
      // Modo local para otras conexiones o sin backend
      console.log('⚠️ Creando sala local');
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
      Animated.parallel([
        Animated.spring(kickedModalScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(kickedModalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };
    
    const handlePlayerKicked = (data) => {
      console.log('🔔 *** EVENTO PLAYERKICKED RECIBIDO ***');
      console.log('❌ Jugador expulsado individualmente:', data);
      console.log('📱 Mostrando modal de expulsión individual...');
      
      // Mostrar modal personalizado al jugador expulsado
      setShowKickedModal(true);
      
      // Animar entrada del modal
      Animated.parallel([
        Animated.spring(kickedModalScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(kickedModalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
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
    
    // Si el jugador se unió a una sala (no es host), mostrar modal de jugador
    if (isJoining && !isHost) {
      setShowLeaveModal(true);
      
      // Animar entrada del modal
      Animated.parallel([
        Animated.spring(leaveModalScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(leaveModalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isHost && !isJoining) {
      // Si es host y creó la sala, mostrar modal de host
      setShowHostLeaveModal(true);
      
      // Animar entrada del modal de host
      Animated.parallel([
        Animated.spring(hostLeaveModalScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(hostLeaveModalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Para otros casos, comportamiento normal
      navigation.goBack();
    }
  };

  const handleCloseLeaveModal = () => {
    // Animar salida del modal
    Animated.parallel([
      Animated.timing(leaveModalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(leaveModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
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
    Animated.parallel([
      Animated.timing(hostLeaveModalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(hostLeaveModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
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
            // En modo online, navegar a LobbyConfigScreen
            navigation.navigate('LobbyConfig', {
              gameMode: gameMode || 'classic',
              playMethod: playMethod || 'multiple',
              connectionType: connectionType || 'wifi',
              playerCount: playerCount || 2
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
            navigation.navigate('LobbyConfig', {
              gameMode: gameMode || 'classic',
              playMethod: playMethod || 'multiple',
              connectionType: connectionType || 'wifi',
              playerCount: playerCount || 2
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
    Animated.parallel([
      Animated.timing(kickedModalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(kickedModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
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
      Animated.parallel([
        Animated.spring(kickPlayerModalScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(kickPlayerModalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };
  
  // Funciones para modal de expulsión de jugador
  const handleCloseKickPlayerModal = () => {
    Animated.parallel([
      Animated.timing(kickPlayerModalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(kickPlayerModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
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
          
          playBeerSound();
          
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
    playBeerSound();
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
    showCustomModal('🎮 ¡Iniciando Juego!', `${connectedPlayers.length} jugadores listos para jugar`, 'success');
  };

  const canStartGame = isHost && connectedPlayers.length >= 2;

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
              {connectedPlayers.map((player, index) => (
                <View key={player.id || `player-${index}`} style={[
                  styles.playerItem,
                  player.isCurrentUser && styles.currentUserItem
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
                    
                    {/* Información adicional del jugador */}
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
      <Modal
        visible={showLeaveModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
      >
        <View style={styles.leaveModalOverlay}>
          <Animated.View
            style={[
              styles.leaveModalContainer,
              {
                transform: [{ scale: leaveModalScale }],
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
      </Modal>

      {/* Modal personalizado para confirmación de disolución de sala (Host) */}
      <Modal
        visible={showHostLeaveModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
      >
        <View style={styles.hostLeaveModalOverlay}>
          <Animated.View
            style={[
              styles.hostLeaveModalContainer,
              {
                transform: [{ scale: hostLeaveModalScale }],
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
      </Modal>

      {/* Modal personalizado para notificación de expulsión */}
      <Modal
        visible={showKickedModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={() => {}} // No permitir cerrar con botón atrás
      >
        <View style={styles.leaveModalOverlay}>
          <Animated.View 
            style={[
              styles.leaveModalContainer,
              {
                transform: [{ scale: kickedModalScale }, { rotate: '1deg' }],
                opacity: kickedModalOpacity,
              }
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
      </Modal>
      
      {/* Modal personalizado para expulsión de jugador */}
      <Modal
        visible={showKickPlayerModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseKickPlayerModal}
      >
        <View style={styles.leaveModalOverlay}>
          <Animated.View 
            style={[
              styles.leaveModalContainer,
              {
                transform: [{ scale: kickPlayerModalScale }],
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
      </Modal>

      {/* Modal genérico personalizado para errores */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseGenericModal}
      >
        <View style={styles.leaveModalOverlay}>
          <Animated.View 
            style={[
              styles.leaveModalContainer,
              {
                transform: [{ scale: genericModalScale }],
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
      </Modal>

      {/* Modal genérico personalizado para éxitos */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseGenericModal}
      >
        <View style={styles.leaveModalOverlay}>
          <Animated.View 
            style={[
              styles.leaveModalContainer,
              {
                transform: [{ scale: genericModalScale }],
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
      </Modal>

      {/* Modal genérico personalizado para información */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseGenericModal}
      >
        <View style={styles.leaveModalOverlay}>
          <Animated.View 
            style={[
              styles.leaveModalContainer,
              {
                transform: [{ scale: genericModalScale }],
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
      </Modal>
    </Animated.View>
  );
};

// Obtener información del dispositivo para estilos dinámicos
const { width, height } = Dimensions.get('window');
const deviceType = getDeviceType();
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
  
  playerAvatarEmoji: {
    backgroundColor: theme.colors.postItYellow,
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
  
  currentUserItem: {
    borderColor: theme.colors.postItGreen,
    borderWidth: 3,
    backgroundColor: '#F0FDF4',
  },
  
  playerDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  
  playerDetail: {
    fontSize: 12,
    marginRight: 5,
  },
  
  connectionStatus: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  
  connectionDot: {
    fontSize: 8,
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

  // Estilos del modal de confirmación de salida
  leaveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  
  leaveModalContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: 25,
    padding: 20,
    maxWidth: 500,
    width: '90%',
    minHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 3,
    borderColor: '#000000',
    borderTopLeftRadius: 5,
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
    left: 45,
    right: 15,
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.4,
  },
  
  leaveModalRedLine: {
    position: 'absolute',
    left: 40,
    top: 15,
    bottom: 15,
    width: 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },
  
  leaveModalHoles: {
    position: 'absolute',
    left: 15,
    top: 40,
    bottom: 40,
    width: 15,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  leaveModalHole: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  
  leaveModalContent: {
    paddingLeft: 55,
    paddingRight: 25,
    paddingTop: 30,
    paddingBottom: 25,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  
  leaveModalTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 15,
    transform: [{ rotate: '0.5deg' }],
  },
  
  leaveModalMessage: {
    fontSize: 15,
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  
  leaveModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  
  leaveModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderTopLeftRadius: 3,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    minHeight: 45,
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
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  leaveModalConfirmButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },

  // Estilos del modal de confirmación para host (disolución de sala)
  hostLeaveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 40,
  },
  
  hostLeaveModalContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: 25,
    padding: 20,
    maxWidth: 520,
    width: '92%',
    minHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 25,
    borderWidth: 3,
    borderColor: '#000000',
    borderTopLeftRadius: 5,
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
    left: 50,
    right: 15,
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.5,
  },
  
  hostLeaveModalRedLine: {
    position: 'absolute',
    left: 45,
    top: 15,
    bottom: 15,
    width: 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.6,
  },
  
  hostLeaveModalHoles: {
    position: 'absolute',
    left: 15,
    top: 50,
    bottom: 50,
    width: 18,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  hostLeaveModalHole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  
  hostLeaveModalContent: {
    paddingLeft: 60,
    paddingRight: 25,
    paddingTop: 35,
    paddingBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  
  hostLeaveModalTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 18,
    transform: [{ rotate: '0.3deg' }],
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  hostLeaveModalMessage: {
    fontSize: 15,
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 35,
    paddingHorizontal: 5,
  },
  
  hostLeaveModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 18,
  },
  
  hostLeaveModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderTopLeftRadius: 4,
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    minHeight: 50,
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
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  hostLeaveModalConfirmButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
});

export default CreateLobbyScreen;