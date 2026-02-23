import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../../styles/theme';
import { useSafeAreaOffsets } from '../../hooks/useSafeAreaOffsets';
import { useSocket, useRoom } from '../../hooks/useSocket';
import { setRoomData } from '../../store/connectionSlice';
import SocketService from '../../services/SocketService';
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
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  RESPONSIVE,
  getDeviceInfo
} from '../../utils/responsive';

// Obtener información del dispositivo para estilos dinámicos
const width = SCREEN_WIDTH;
const height = SCREEN_HEIGHT;
const deviceType = getDeviceType();
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();
const screenHeight = getScreenHeight();

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
  const { connect, disconnect, connected } = useSocket();
  const { joinRoom, loading: roomLoading, error: roomError } = useRoom();

  // Safe area offsets para iOS
  const { leftOffset, rightOffset, topOffset } = useSafeAreaOffsets();

  // Estados
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const errorModalScale = useRef(new Animated.Value(0)).current;
  const errorModalOpacity = useRef(new Animated.Value(0)).current;
  
  
  // Estado y animación para el botón de mute
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const muteButtonScale = useRef(new Animated.Value(1)).current;

  // Efecto para solicitar permisos de cámara
  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  // Función para conectar al backend
  const initializeBackendConnection = React.useCallback(async () => {
    // Solo intentar conectar si no está ya conectado
    if (!isConnected && !connected) {
      try {
        console.log('🔌 Iniciando conexión al backend desde JoinGameScreen...');
        await connect();
        console.log('✅ Conexión al backend establecida desde JoinGameScreen');
      } catch (error) {
        console.error('❌ Error conectando al backend desde JoinGameScreen:', error.message);
        // No bloquear la funcionalidad, permitir uso offline
      }
    }
  }, [isConnected, connected, connect]);

  // Función para reproducir sonido respetando mute
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

  // Configurar audio y limpiar al salir
  useFocusEffect(
    React.useCallback(() => {
      const setupAudio = async () => {
        // No precargar sonido, se carga cuando sea necesario
      };

      setupAudio();
      
      // Conectar al backend automáticamente
      initializeBackendConnection();
      
      // Iniciar animación de entrada
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      return () => {
        // Limpiar sonidos al salir - AudioService maneja la limpieza automáticamente
      };
    }, [])
  );

  // Función para manejar el mute
  const handleMuteToggle = async () => {
    playWinePopSound();

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

    await playWinePopSound();

    setShowCodeInput(true);

    // Animación del modal
    Animated.timing(modalOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Función para ocultar modal
  const hideCodeInput = () => {
    playWinePopSound();

    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowCodeInput(false);
      setRoomCode('');
    });
  };

  // Función para mostrar modal de error
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);

    // Animar entrada del modal
    Animated.timing(errorModalOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Función para ocultar modal de error
  const hideErrorModal = () => {
    playWinePopSound();

    Animated.timing(errorModalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
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

    // Sonido beer para navegación exitosa
    await playBeerSound();

    if (!(connected || isConnected || SocketService.connected)) {
      showError('No hay conexión con el servidor. Verifica tu conexión a internet.');
      return;
    }

    try {
      setIsJoining(true);
      console.log('🔍 Validando existencia de sala:', roomCode.trim());
      
      // Validar sala usando el backend con timeout
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('TIMEOUT'));
        }, 10000); // 10 segundos de timeout
        
        if (!SocketService.socket) {
          clearTimeout(timeout);
          reject(new Error('SOCKET_NOT_AVAILABLE'));
          return;
        }
        
        SocketService.socket.emit('validateRoom', { roomCode: roomCode.trim() }, (response) => {
          clearTimeout(timeout);
          
          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'VALIDATION_FAILED'));
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
      } else if (error.message === 'TIMEOUT') {
        errorMessage = 'Timeout de conexión. El servidor tardó mucho en responder. Inténtalo de nuevo.';
      } else if (error.message === 'SOCKET_NOT_AVAILABLE') {
        errorMessage = 'Socket no disponible. Verifica tu conexión e inténtalo de nuevo.';
      } else if (error.message === 'VALIDATION_FAILED') {
        errorMessage = 'Error en la validación de la sala. Inténtalo de nuevo.';
      } else if (error.message.includes('connection')) {
        errorMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
      }
      
      showError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  // Función para escanear QR
  const handleScanQR = async () => {
    await playWinePopSound();

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {}

    if (hasPermission === null) {
      Alert.alert('Error', 'Solicitando permisos de cámara...');
      return;
    }
    if (hasPermission === false) {
      Alert.alert(
        'Sin permisos de cámara',
        'Por favor permite el acceso a la cámara para escanear códigos QR.',
        [{ text: 'OK' }]
      );
      return;
    }

    setScanned(false);
    setShowQRScanner(true);
  };

  // Función para manejar el escaneo del código QR
  const handleBarcodeScanned = async ({ type, data }) => {
    setScanned(true);
    setShowQRScanner(false);

    // Validar que sea un código de 6 dígitos
    if (data && data.length === 6 && /^\d{6}$/.test(data)) {
      await playWinePopSound();

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {}

      // Navegar directamente a PlayerRegistrationScreen con el código para multijugador
      navigation.navigate('PlayerRegistration', {
        roomCode: data,
        isJoining: true,
        gameMode: 'classic', // Por defecto, pero se obtendrá del backend
        playMethod: 'multiple',
        connectionType: 'wifi'
      });
    } else {
      // Código QR inválido
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {}

      setErrorMessage('Código QR inválido. Debe ser un código de 6 dígitos.');
      setShowErrorModal(true);
    }
  };

  const handleGoBack = async () => {
    await playBeerSound(); // Es navegación, usa beer sound

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
          <View key={i} style={[styles.blueLine, { top: scaleByContent(80, 'spacing') + i * scaleByContent(30, 'spacing') }]} />
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
        style={[
          styles.backButton,
          {
            left: leftOffset,
            top: topOffset + scaleByContent(30, 'spacing'),
          },
        ]}
        onPress={handleGoBack}
        activeOpacity={0.7}
      >
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>

      {/* Indicador de conexión */}
      <View style={styles.connectionIndicator}>
        <View style={[
          styles.connectionDot,
          { backgroundColor: (connected || isConnected) ? '#4CAF50' : '#F44336' }
        ]} />
        <Text style={styles.connectionText}>
          {(connected || isConnected) ? 'Online' : 'Offline'}
        </Text>
      </View>

      {/* Botón de mute */}
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
          onPress={handleMuteToggle}
          style={styles.muteButtonTouchable}
          activeOpacity={0.8}
        >
          <CustomMuteIcon
            size={scaleModerate(50, 0.3)}
            isMuted={isMuted}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal para código manual */}
      {showCodeInput && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
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
      </View>)}

      {/* Modal de error personalizado */}
      {showErrorModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
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
      </View>)}

      {/* Modal del Escáner QR */}
      {showQRScanner && (
        <View style={styles.qrScannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />

          {/* Overlay con instrucciones */}
          <View style={styles.qrOverlay}>
            <View style={styles.qrHeader}>
              <TouchableOpacity
                style={styles.qrCloseButton}
                onPress={() => setShowQRScanner(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.qrCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.qrInstructionsContainer}>
              <Text style={styles.qrInstructionsTitle}>Escanear Código QR</Text>
              <Text style={styles.qrInstructionsText}>
                Apunta la cámara hacia el código QR
              </Text>
            </View>

            {/* Marco del escáner */}
            <View style={styles.qrScanFrame}>
              <View style={styles.qrCorner} />
              <View style={[styles.qrCorner, styles.qrCornerTopRight]} />
              <View style={[styles.qrCorner, styles.qrCornerBottomLeft]} />
              <View style={[styles.qrCorner, styles.qrCornerBottomRight]} />
            </View>
          </View>
        </View>
      )}
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
    borderRadius: scaleBorder(10),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
    borderColor: '#D0D0D0',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
  },

  redLine: {
    position: 'absolute',
    left: scaleByContent(95, 'spacing'),
    top: 0,
    bottom: 0,
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
    opacity: 0.5,
  },

  blueLine: {
    position: 'absolute',
    left: scaleByContent(100, 'spacing'),
    right: scaleByContent(20, 'spacing'),
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.6,
  },

  content: {
    flex: 1,
    justifyContent: isShortHeight ? 'center' : (Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 'center' : 'flex-start'),
    paddingHorizontal: scaleByContent(40, 'spacing'),
    paddingVertical: isShortHeight ? scaleByContent(5, 'spacing') : scaleByContent(10, 'spacing'),
    paddingTop: isShortHeight ? scaleByContent(10, 'spacing') : (Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? scaleByContent(20, 'spacing') : scaleByContent(40, 'spacing')),
    paddingBottom: isShortHeight ? scaleByContent(40, 'spacing') : scaleByContent(120, 'spacing'),
    alignItems: 'center',
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: isShortHeight ? scaleByContent(10, 'spacing') : scaleByContent(20, 'spacing'),
    marginTop: isShortHeight ? scaleByContent(5, 'spacing') : scaleByContent(10, 'spacing'),
  },

  title: {
    fontSize: scaleByContent(32, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  subtitle: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    transform: [{ rotate: '0deg' }],
  },

  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(20, 'spacing'),
    gap: scaleByContent(10, 'spacing'),
  },

  mainButton: {
    width: Math.min(width * 0.4, scaleByContent(260, 'interactive')),
    height: isShortHeight ? Math.min(screenHeight * 0.55, scaleByContent(220, 'interactive')) : Math.min(screenHeight * 0.65, scaleByContent(320, 'interactive')),
    padding: isShortHeight ? scaleByContent(15, 'spacing') : scaleByContent(25, 'spacing'),
    borderRadius: scaleBorder(18),
    borderTopLeftRadius: scaleBorder(6),
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(5, 'spacing'), height: scaleByContent(5, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(10, 'spacing'),
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  qrButton: {
    backgroundColor: theme.colors.postItGreen,
    transform: [{ rotate: '0deg' }],
  },

  codeButton: {
    backgroundColor: theme.colors.postItBlue,
    transform: [{ rotate: '0deg' }],
  },

  buttonIcon: {
    marginBottom: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(15, 'spacing'),
  },

  iconText: {
    fontSize: isShortHeight ? scaleByContent(40, 'text') : scaleByContent(50, 'text'),
  },

  buttonTitle: {
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
  },

  buttonDescription: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
    lineHeight: scaleByContent(18, 'text'),
    opacity: 0.8,
    paddingHorizontal: scaleByContent(5, 'spacing'),
  },

  connectionIndicator: {
    position: 'absolute',
    top: scaleByContent(30, 'spacing'),
    right: scaleByContent(110, 'spacing'),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: scaleByContent(12, 'spacing'),
    paddingVertical: scaleByContent(6, 'spacing'),
    borderRadius: scaleBorder(15),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    zIndex: 1000,
  },

  connectionDot: {
    width: scaleByContent(8, 'icon'),
    height: scaleByContent(8, 'icon'),
    borderRadius: scaleBorder(4),
    marginRight: scaleByContent(6, 'spacing'),
  },

  connectionText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#333',
  },

  backButton: {
    position: 'absolute',
    top: scaleByContent(40, 'spacing'),
    left: scaleByContent(30, 'spacing'),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scaleByContent(20, 'spacing'),
    paddingVertical: scaleByContent(10, 'spacing'),
    borderRadius: scaleBorder(15),
    borderTopLeftRadius: scaleBorder(5),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
    transform: [{ rotate: '0deg' }],
    zIndex: 10,
  },

  backButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },

  // Estilos para el botón de mute (idéntico a otras pantallas)
  sketchMuteButton: {
    position: 'absolute',
    top: scaleByContent(30, 'spacing'),
    right: scaleByContent(30, 'spacing'),
    width: scaleByContent(70, 'interactive'),
    height: scaleByContent(70, 'interactive'),
    borderRadius: scaleBorder(35),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: scaleByContent(3, 'spacing'),
      height: scaleByContent(3, 'spacing')
    },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(6, 'spacing'),
    elevation: 6,
    transform: [{ rotate: '0deg' }],
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
    transform: [{ rotate: '0deg' }], // Counter-rotate
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
    height: scaleByContent(3, 'spacing'),
    borderRadius: scaleBorder(2),
    transform: [{ rotate: '45deg' }],
  },

  // Modal styles
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
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: width * 0.8,
    maxWidth: scaleByContent(400, 'interactive'),
    backgroundColor: '#F8F6F0',
    borderRadius: scaleBorder(20),
    borderWidth: scaleBorder(3),
    borderColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleByContent(10, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(20, 'spacing'),
    elevation: 20,
  },

  modalPaper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 17,
  },

  modalHoles: {
    position: 'absolute',
    left: scaleByContent(25, 'spacing'),
    top: scaleByContent(40, 'spacing'),
    flexDirection: 'column',
  },

  modalHole: {
    width: scaleByContent(12, 'spacing'),
    height: scaleByContent(12, 'spacing'),
    borderRadius: scaleBorder(6),
    backgroundColor: '#E0E0E0',
    marginBottom: scaleByContent(40, 'spacing'),
  },

  modalRedLine: {
    position: 'absolute',
    left: scaleByContent(50, 'spacing'),
    top: 0,
    bottom: 0,
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
  },

  modalContent: {
    padding: scaleByContent(30, 'spacing'),
    paddingLeft: scaleByContent(70, 'spacing'),
  },

  modalTitle: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  modalSubtitle: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginBottom: scaleByContent(30, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  inputContainer: {
    marginBottom: scaleByContent(20, 'spacing'),
  },

  inputLabel: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    marginBottom: scaleByContent(8, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  textInput: {
    backgroundColor: '#FFF',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(12),
    paddingHorizontal: scaleByContent(15, 'spacing'),
    paddingVertical: scaleByContent(12, 'spacing'),
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
  },

  codeInput: {
    backgroundColor: '#FFF',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(12),
    paddingHorizontal: scaleByContent(15, 'spacing'),
    paddingVertical: scaleByContent(15, 'spacing'),
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    letterSpacing: 8,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scaleByContent(30, 'spacing'),
  },

  modalButton: {
    flex: 1,
    paddingVertical: scaleByContent(15, 'spacing'),
    borderRadius: scaleBorder(12),
    alignItems: 'center',
    marginHorizontal: scaleByContent(5, 'spacing'),
  },

  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
  },

  cancelButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
  },

  joinButton: {
    backgroundColor: '#4CAF50',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
  },

  joinButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFF',
  },

  errorButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
  },

  errorButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFF',
  },

  // Estilos del escáner QR
  qrScannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 10000,
  },

  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  qrOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },

  qrHeader: {
    position: 'absolute',
    top: scaleByContent(50, 'spacing'),
    right: scaleByContent(20, 'spacing'),
    zIndex: 1,
  },

  qrCloseButton: {
    width: scaleByContent(44, 'interactive'),
    height: scaleByContent(44, 'interactive'),
    borderRadius: scaleBorder(22),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  qrCloseButtonText: {
    fontSize: scaleByContent(24, 'text'),
    color: '#FFF',
    fontWeight: 'bold',
  },

  qrInstructionsContainer: {
    position: 'absolute',
    top: scaleByContent(120, 'spacing'),
    left: scaleByContent(20, 'spacing'),
    right: scaleByContent(20, 'spacing'),
    alignItems: 'center',
  },

  qrInstructionsTitle: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
  },

  qrInstructionsText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#FFF',
    textAlign: 'center',
  },

  qrScanFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: scaleByContent(250, 'interactive'),
    height: scaleByContent(250, 'interactive'),
    marginTop: scaleByContent(-125, 'spacing'),
    marginLeft: scaleByContent(-125, 'spacing'),
  },

  qrCorner: {
    position: 'absolute',
    width: scaleByContent(30, 'spacing'),
    height: scaleByContent(30, 'spacing'),
    borderColor: '#FFF',
    borderWidth: scaleBorder(3),
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },

  qrCornerTopRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: scaleBorder(3),
    borderTopWidth: scaleBorder(3),
  },

  qrCornerBottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderLeftWidth: scaleBorder(3),
    borderBottomWidth: scaleBorder(3),
  },

  qrCornerBottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: scaleBorder(3),
    borderBottomWidth: scaleBorder(3),
  },
});

export default JoinGameScreen;