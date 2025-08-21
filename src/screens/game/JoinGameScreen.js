import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
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

const { width, height } = Dimensions.get('window');

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

const JoinGameScreen = ({ navigation }) => {
  // Redux
  const dispatch = useDispatch();
  const { isConnected, socketId } = useSelector(state => state.connection);
  
  // Socket hooks
  const { joinRoom, loading: roomLoading, error: roomError } = useRoom();
  
  // Estados
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const errorModalScale = useRef(new Animated.Value(0)).current;
  const errorModalOpacity = useRef(new Animated.Value(0)).current;
  
  // Referencias para sonidos
  const beerSound = useRef(null);
  
  // Estado y animación para el botón de mute
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const muteButtonScale = useRef(new Animated.Value(1)).current;

  // Configurar audio y limpiar al salir
  useFocusEffect(
    React.useCallback(() => {
      const setupAudio = async () => {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            interruptionModeIOS: 1,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: 1,
            playThroughEarpieceAndroid: false,
          });

          const { sound } = await Audio.Sound.createAsync(
            require('../../../assets/sounds/beer.can.sound.mp3'),
            { volume: 0.8 }
          );
          beerSound.current = sound;

        } catch (error) {
          console.error('Error configurando audio:', error);
        }
      };

      setupAudio();
      
      // Iniciar animación de entrada
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      return () => {
        // Limpiar sonidos al salir
        if (beerSound.current) {
          beerSound.current.unloadAsync().catch(console.error);
        }
      };
    }, [])
  );

  // Función para manejar el mute
  const handleMuteToggle = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics no disponible en algunos dispositivos
    }

    // Animación del botón
    Animated.sequence([
      Animated.timing(muteButtonScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(muteButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Toggle del mute usando el método correcto
    const newMutedState = await audioService.toggleMute();
    setIsMuted(newMutedState);
  };

  // Función para mostrar modal de código manual
  const handleShowCodeInput = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    if (beerSound.current) {
      try {
        await beerSound.current.replayAsync();
      } catch (error) {
        console.error('Error reproduciendo sonido:', error);
      }
    }

    setShowCodeInput(true);
    
    // Animación del modal
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Función para ocultar modal
  const hideCodeInput = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCodeInput(false);
      setRoomCode('');
    });
  };

  // Función para mostrar modal de error
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
    
    // Animar entrada del modal
    Animated.parallel([
      Animated.spring(errorModalScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(errorModalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Función para ocultar modal de error
  const hideErrorModal = () => {
    Animated.parallel([
      Animated.timing(errorModalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(errorModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowErrorModal(false);
      setErrorMessage('');
    });
  };

  // Función para validar código de sala usando el backend
  const handleJoinByCode = async () => {
    if (!roomCode.trim() || roomCode.length !== 6) {
      showError('Ingresa un código válido de 6 números');
      return;
    }

    if (!isConnected) {
      showError('No hay conexión con el servidor. Verifica tu conexión a internet.');
      return;
    }

    try {
      setIsJoining(true);
      console.log('🔍 Validando existencia de sala:', roomCode.trim());
      
      // Validar sala usando el backend
      const response = await new Promise((resolve, reject) => {
        SocketService.socket.emit('validateRoom', { roomCode: roomCode.trim() }, (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error));
          }
        });
      });
      
      console.log('✅ Sala válida, navegando a registro...');
      
      // Cerrar modal de código y navegar
      hideCodeInput();
      navigation.navigate('PlayerRegistration', { 
        roomCode: roomCode.trim(),
        isHost: false,
        useBackend: true,
        isJoining: true,
        roomData: { room: { id: roomCode.trim() } }
      });
      
    } catch (error) {
      console.error('❌ Error validando sala:', error.message);
      
      let errorMessage = 'No se pudo acceder a la sala';
      if (error.message === 'ROOM_NOT_FOUND') {
        errorMessage = 'No se encontró una sala con ese código. Verifica el código e inténtalo de nuevo.';
      } else if (error.message === 'ROOM_FULL') {
        errorMessage = 'La sala está llena. No se pueden agregar más jugadores.';
      } else if (error.message.includes('connection')) {
        errorMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
      }
      
      showError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  // Función para escanear QR (placeholder por ahora)
  const handleScanQR = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    Alert.alert(
      '📱 Escanear QR',
      'Funcionalidad de QR próximamente.\n\nPor ahora puedes usar el código manual.',
      [{ text: 'OK' }]
    );
  };

  const handleGoBack = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    // Ir al MainMenu en lugar de goBack() para evitar errores de navegación
    // Esto funciona tanto si se llega desde CreateGame como desde lobby exit
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainMenu' }],
    });
  };

  return (
    <View style={styles.container}>
      {/* Fondo de papel */}
      <View style={styles.paperBackground}>
        {/* Agujeros del cuaderno */}
        <View style={styles.holes}>
          {[...Array(8)].map((_, i) => (
            <View key={i} style={styles.hole} />
          ))}
        </View>
        
        {/* Línea roja del margen */}
        <View style={styles.redLine} />
        
        {/* Líneas horizontales azules */}
        {[...Array(25)].map((_, i) => (
          <View key={i} style={[styles.blueLine, { top: 80 + i * 30 }]} />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Título */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Unirse a Partida</Text>
          <Text style={styles.subtitle}>Escoge cómo unirte a la diversión</Text>
        </View>

        {/* Botones principales */}
        <View style={styles.buttonsContainer}>
          {/* Botón Escanear QR */}
          <TouchableOpacity
            style={[styles.mainButton, styles.qrButton]}
            onPress={handleScanQR}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.iconText}>📱</Text>
            </View>
            <Text style={styles.buttonTitle}>Escanear QR</Text>
            <Text style={styles.buttonDescription}>
              Escanea código{'\n'}del host
            </Text>
          </TouchableOpacity>

          {/* Botón Código Manual */}
          <TouchableOpacity
            style={[styles.mainButton, styles.codeButton]}
            onPress={handleShowCodeInput}
            activeOpacity={0.8}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.iconText}>🔢</Text>
            </View>
            <Text style={styles.buttonTitle}>Código Manual</Text>
            <Text style={styles.buttonDescription}>
              Ingresa código{'\n'}de 6 números
            </Text>
          </TouchableOpacity>
        </View>

      </Animated.View>

      {/* Botón de regreso */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleGoBack}
        activeOpacity={0.7}
      >
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>

      {/* Indicador de conexión */}
      <View style={styles.connectionIndicator}>
        <View style={[
          styles.connectionDot,
          { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
        ]} />
        <Text style={styles.connectionText}>
          {isConnected ? 'Online' : 'Offline'}
        </Text>
      </View>

      {/* Botón de mute */}
      <Animated.View 
        style={[
          styles.sketchMuteButton,
          {
            transform: [{ scale: muteButtonScale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleMuteToggle}
          style={styles.muteButtonTouchable}
          activeOpacity={0.8}
        >
          <CustomMuteIcon 
            size={50}
            isMuted={isMuted}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal para código manual */}
      <Modal
        visible={showCodeInput}
        transparent={true}
        animationType="none"
        onRequestClose={hideCodeInput}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
              }
            ]}
          >
            {/* Fondo de papel del modal */}
            <View style={styles.modalPaper}>
              <View style={styles.modalHoles}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.modalHole} />
                ))}
              </View>
              <View style={styles.modalRedLine} />
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Unirse a Sala</Text>
              <Text style={styles.modalSubtitle}>Ingresa el código de la sala</Text>

              {/* Input para código de sala */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Código de sala:</Text>
                <TextInput
                  style={styles.codeInput}
                  placeholder="123456"
                  placeholderTextColor="#999"
                  value={roomCode}
                  onChangeText={(text) => setRoomCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
                />
              </View>

              {/* Botones del modal */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={hideCodeInput}
                  activeOpacity={0.8}
                  disabled={isJoining}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.joinButton]}
                  onPress={handleJoinByCode}
                  activeOpacity={0.8}
                  disabled={isJoining || !roomCode.trim()}
                >
                  {isJoining ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.joinButtonText}>Unirse</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de error personalizado */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="none"
        onRequestClose={hideErrorModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: errorModalScale }],
                opacity: errorModalOpacity,
              }
            ]}
          >
            {/* Fondo de papel del modal */}
            <View style={styles.modalPaper}>
              <View style={styles.modalHoles}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.modalHole} />
                ))}
              </View>
              <View style={styles.modalRedLine} />
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>❌ Error</Text>
              <Text style={styles.modalSubtitle}>{errorMessage}</Text>

              {/* Botón de cerrar */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.errorButton]}
                  onPress={hideErrorModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.errorButtonText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

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

  holes: {
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

  redLine: {
    position: 'absolute',
    left: 95,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.5,
  },

  blueLine: {
    position: 'absolute',
    left: 100,
    right: 20,
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.6,
  },

  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 10,
    paddingTop: 40,
    paddingBottom: 120,
    alignItems: 'center',
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },

  title: {
    fontSize: 32,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    transform: [{ rotate: '0.5deg' }],
  },

  subtitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    transform: [{ rotate: '-0.3deg' }],
  },

  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },

  mainButton: {
    width: Math.min(width * 0.4, 260),
    height: Math.min(width * 0.5, 320),
    padding: 25,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  qrButton: {
    backgroundColor: theme.colors.postItGreen,
    transform: [{ rotate: '-2deg' }],
  },

  codeButton: {
    backgroundColor: theme.colors.postItBlue,
    transform: [{ rotate: '2deg' }],
  },

  buttonIcon: {
    marginBottom: 15,
  },

  iconText: {
    fontSize: 50,
  },

  buttonTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },

  buttonDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.8,
    paddingHorizontal: 5,
  },

  connectionIndicator: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    zIndex: 1000,
  },

  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  connectionText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: '#333',
  },

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

  // Estilos para el botón de mute (idéntico a otras pantallas)
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
    shadowOffset: { 
      width: 3, 
      height: 3 
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '1.5deg' }],
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
    transform: [{ rotate: '-1.5deg' }], // Counter-rotate
  },
  
  megaphoneImage: {
    // Los estilos dinámicos se aplican inline (width, height, opacity)
  },
  
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: width * 0.8,
    maxWidth: 400,
    backgroundColor: '#F8F6F0',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },

  modalPaper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 17,
  },

  modalHoles: {
    position: 'absolute',
    left: 25,
    top: 40,
    flexDirection: 'column',
  },

  modalHole: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginBottom: 40,
  },

  modalRedLine: {
    position: 'absolute',
    left: 50,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF6B6B',
  },

  modalContent: {
    padding: 30,
    paddingLeft: 70,
  },

  modalTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    transform: [{ rotate: '-0.5deg' }],
  },

  modalSubtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    transform: [{ rotate: '0.3deg' }],
  },

  inputContainer: {
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: '#000000',
    marginBottom: 8,
    transform: [{ rotate: '-0.2deg' }],
  },

  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: '#000000',
  },

  codeInput: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 24,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    letterSpacing: 8,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },

  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#000000',
  },

  cancelButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: '#000000',
  },

  joinButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000000',
  },

  joinButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#FFF',
  },

  errorButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#000000',
  },

  errorButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#FFF',
  },
});

export default JoinGameScreen;