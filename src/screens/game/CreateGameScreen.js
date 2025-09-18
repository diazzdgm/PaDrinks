import React, { useRef, useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../../styles/theme';
import { setGameMode } from '../../store/gameSlice';
import { useSocket, useRoom } from '../../hooks/useSocket';
import { setSocketConnected, setRoomData } from '../../store/connectionSlice';
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

const CreateGameScreen = ({ navigation }) => {
  // Redux
  const dispatch = useDispatch();
  const { isConnected, isConnecting } = useSelector(state => state.connection);
  
  // Socket hooks
  const { connect, disconnect, connected } = useSocket();
  const { createRoom, loading: roomLoading, error: roomError } = useRoom();
  
  // Device info para responsive design
  const deviceInfo = getDeviceInfo();
  const deviceType = getDeviceType();
  
  // Estado para el modo seleccionado y modal
  const [selectedMode, setSelectedMode] = useState(null);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [modalModeInfo, setModalModeInfo] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  
  // Animaciones del modal
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  
  // SOLO animaciones básicas necesarias
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Referencias para sonidos
  const beerSound = useRef(null);
  
  // Estado y animación para el botón de mute
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const muteButtonScale = useRef(new Animated.Value(1)).current;

  // SWIPE SYSTEM - Con prevención de clicks accidentales
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isSwipeInProgress, setIsSwipeInProgress] = useState(false);
  const minSwipeDistance = 50;
  
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.nativeEvent.pageX);
    setIsSwipeInProgress(false);
    console.log('Touch started at:', e.nativeEvent.pageX);
  };
  
  const onTouchMove = (e) => {
    setTouchEnd(e.nativeEvent.pageX);
    
    // Detectar si estamos en un swipe para prevenir clicks
    if (touchStart && Math.abs(e.nativeEvent.pageX - touchStart) > 20) {
      setIsSwipeInProgress(true);
    }
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setTimeout(() => setIsSwipeInProgress(false), 100);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    console.log('Touch ended - distance:', distance);
    
    if (isLeftSwipe || isRightSwipe) {
      setIsSwipeInProgress(true); // Marcar como swipe para prevenir click
      
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptics not available:', error);
      }
      
      if (isLeftSwipe) {
        // Swipe izquierda - siguiente modo
        const newIndex = selectedModeIndex === gameModes.length - 1 ? 0 : selectedModeIndex + 1;
        console.log('← SWIPE LEFT: Siguiente modo -', gameModes[newIndex].title);
        setSelectedModeIndex(newIndex);
      }
      
      if (isRightSwipe) {
        // Swipe derecha - modo anterior
        const newIndex = selectedModeIndex === 0 ? gameModes.length - 1 : selectedModeIndex - 1;
        console.log('→ SWIPE RIGHT: Modo anterior -', gameModes[newIndex].title);
        setSelectedModeIndex(newIndex);
      }
      
      // Reset después de un breve delay
      setTimeout(() => setIsSwipeInProgress(false), 300);
    } else {
      // No fue un swipe, permitir clicks después de un delay corto
      setTimeout(() => setIsSwipeInProgress(false), 100);
    }
  };
  
  // Estado del carrusel simple
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  
  const gameModes = [
    {
      id: 'classic',
      icon: '🍺',
      title: 'Clásico',
      description: 'El modo tradicional de PaDrinks',
      color: theme.colors.postItYellow,
      textColor: '#2E2E2E',
      available: true
    },
    {
      id: 'hot',
      icon: '🔥',
      title: 'Hot',
      description: 'Próximamente...',
      color: theme.colors.postItPink,
      textColor: '#2E2E2E',
      available: false
    },
    {
      id: 'couple',
      icon: '💕',
      title: 'Pareja',
      description: 'Próximamente...',
      color: theme.colors.postItBlue,
      textColor: '#2E2E2E',
      available: false
    }
  ];
  
  // Simplificar useFocusEffect completamente
  useFocusEffect(
    React.useCallback(() => {
      // Sincronizar estado de mute cuando regresamos a la pantalla
      setIsMuted(audioService.isMusicMuted);
      
      // Solo animación de fade básica
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      return () => {
        cleanupSound();
      };
    }, [])
  );

  const cleanupSound = async () => {
    if (beerSound.current) {
      try {
        await beerSound.current.unloadAsync();
      } catch (error) {
        console.log('Error cleaning up beer sound:', error);
      }
    }
  };

  const playBeerSound = async () => {
    const soundObject = await audioService.playSoundEffect(
      require('../../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );
    
    if (soundObject) {
      beerSound.current = soundObject;
      console.log('🍺 Reproduciendo sonido de lata de cerveza...');
    }
  };

  // Verificar estado de conexión (la conexión se hace desde MainMenu)
  useEffect(() => {
    if (connected) {
      setConnectionStatus('connected');
    } else if (isConnecting) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [connected, isConnecting]);

  const handleModeSelect = (mode, index) => {
    // Prevenir click si acabamos de hacer un swipe
    if (isSwipeInProgress) {
      console.log('Click bloqueado - swipe en progreso');
      return;
    }
    
    const gameMode = gameModes[index];
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playBeerSound();
    
    if (gameMode.available) {
      setSelectedMode(gameMode.id);
      dispatch(setGameMode(gameMode.id));
      
      // Navegar a configuración de lobby (la sala se crea allí)
      setTimeout(() => {
        navigation.navigate('LobbyConfig', { 
          gameMode: gameMode.id
        });
      }, 500);
    } else {
      // Mostrar modal personalizado estilo AgeVerification
      setModalModeInfo(gameMode);
      setShowComingSoonModal(true);
      
      // Animar entrada del modal
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
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
  
  const handleCloseModal = () => {
    // Animar salida del modal
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
      setShowComingSoonModal(false);
      setModalModeInfo(null);
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Fondo de papel con líneas */}
      <View style={styles.paperBackground}>
        <View style={styles.notebookLines}>
          {[...Array(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 50 : Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) < 700 ? 20 : 25)].map((_, index) => (
            <View 
              key={index} 
              style={[styles.line, { top: scaleByContent(40, 'spacing') + (index * scaleByContent(25, 'spacing')) }]} 
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

      {/* Indicador de conexión */}
      <View style={styles.connectionIndicator}>
        <View style={[
          styles.connectionDot,
          { backgroundColor: connected ? '#4CAF50' : connectionStatus === 'connecting' ? '#FF9800' : '#F44336' }
        ]} />
        <Text style={styles.connectionText}>
          {connected ? 'Online' : connectionStatus === 'connecting' ? 'Conectando...' : 'Offline'}
        </Text>
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

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Título */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>SELECCIONA EL MODO</Text>
          <Text style={styles.subtitle}>¿Cómo quieres jugar?</Text>
        </View>

        {/* CARRUSEL SIMPLE */}
        <View style={styles.carouselContainer}>
          {/* Área principal del carrusel con gestos touch */}
          <View 
            style={styles.carouselMainArea}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Botón del modo actual - SIN ANIMACIONES COMPLEJAS */}
            {(() => {
              const currentMode = gameModes[selectedModeIndex];
              
              return (
                <View style={styles.currentModeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      { backgroundColor: currentMode.color },
                      !currentMode.available && styles.disabledMode,
                    ]}
                    onPress={() => handleModeSelect(currentMode.id, selectedModeIndex)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modeIcon}>{currentMode.icon}</Text>
                    <Text style={[styles.modeTitle, { color: currentMode.textColor }]}>
                      {currentMode.title}
                    </Text>
                    <Text style={[styles.modeDescription, { color: currentMode.textColor }]}>
                      {currentMode.description}
                    </Text>
                    
                    {/* Badge de "Próximamente" */}
                    {!currentMode.available && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>PRÓXIMAMENTE</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </View>
      </View>
      
      {/* Indicadores en la parte inferior */}
      <View style={styles.carouselIndicators}>
        {gameModes.map((mode, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.indicator,
              selectedModeIndex === index && styles.activeIndicator,
            ]}
            onPress={() => setSelectedModeIndex(index)}
          >
            <Text style={[
              styles.indicatorEmoji,
              selectedModeIndex === index && styles.activeIndicatorEmoji
            ]}>
              {mode.icon}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Modal personalizado estilo AgeVerification para modos no disponibles */}
      <Modal
        visible={showComingSoonModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
              },
            ]}
          >
            {/* Fondo con patrón de libreta */}
            <View style={styles.modalPaper}>
              {/* Líneas de libreta en el modal */}
              {[...Array(8)].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.modalLine, { top: scaleByContent(20, 'spacing') + (index * scaleByContent(25, 'spacing')) }]} 
                />
              ))}
              
              {/* Línea vertical roja (margen) */}
              <View style={styles.modalRedLine} />
              
              {/* Agujeros de perforación */}
              <View style={styles.modalHoles}>
                {[...Array(3)].map((_, index) => (
                  <View key={index} style={styles.modalHole} />
                ))}
              </View>
              
              {/* Contenido del modal */}
              <View style={styles.modalContent}>
                <Text style={styles.modalIcon}>{modalModeInfo?.icon}</Text>
                <Text style={styles.modalTitle}>Modo {modalModeInfo?.title}</Text>
                <Text style={styles.modalMessage}>
                  Este modo estará disponible próximamente.
                </Text>
                <Text style={styles.modalSubMessage}>
                  ¡Mantente atento a las actualizaciones!
                </Text>
                
                {/* Botón de cerrar */}
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleCloseModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonText}>Entendido</Text>
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
  
  // Indicador de conexión
  connectionIndicator: {
    position: 'absolute',
    top: scaleByContent(30, 'spacing'),
    right: scaleByContent(isSmallScreen ? 100 : isTabletScreen ? 120 : 110, 'spacing'), // Lado izquierdo del botón MUTE
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: scaleByContent(12, 'spacing'),
    paddingVertical: scaleByContent(6, 'spacing'),
    borderRadius: scaleByContent(15, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000', // Contorno negro
    zIndex: 1000,
  },
  
  connectionDot: {
    width: scaleByContent(isSmallScreen ? 6 : isTabletScreen ? 10 : 8, 'spacing'),
    height: scaleByContent(isSmallScreen ? 6 : isTabletScreen ? 10 : 8, 'spacing'),
    borderRadius: scaleByContent(isSmallScreen ? 3 : isTabletScreen ? 5 : 4, 'spacing'),
    marginRight: scaleByContent(6, 'spacing'),
  },
  
  connectionText: {
    fontSize: scaleByContent(isSmallScreen ? 10 : isTabletScreen ? 16 : 12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#333',
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
  
  // Botón de regreso - Exactamente como LobbyConfigScreen
  backButton: {
    position: 'absolute',
    top: scaleByContent(40, 'spacing'),
    left: scaleByContent(30, 'spacing'),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scaleByContent(20, 'spacing'),
    paddingVertical: scaleByContent(10, 'spacing'),
    borderRadius: scaleByContent(15, 'spacing'),
    borderTopLeftRadius: scaleByContent(5, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
    zIndex: 10,
  },
  
  backButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Contenido principal
  content: {
    flex: 1,
    paddingHorizontal: scaleByContent(isSmallScreen ? 25 : isTabletScreen ? 60 : 40, 'spacing'),
    paddingTop: scaleByContent(100, 'spacing'),
    paddingBottom: scaleByContent(100, 'spacing'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Título
  titleContainer: {
    alignItems: 'center',
    marginBottom: scaleByContent(isSmallScreen ? 20 : isTabletScreen ? 35 : 25, 'spacing'),
    position: 'absolute',
    top: scaleByContent(20, 'spacing'),
    left: 0,
    right: 0,
    zIndex: 5,
  },
  
  title: {
    fontSize: scaleByContent(isSmallScreen ? 26 : isTabletScreen ? 42 : 32, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
    transform: [{ rotate: '0.5deg' }],
  },
  
  subtitle: {
    fontSize: scaleByContent(isSmallScreen ? 15 : isTabletScreen ? 24 : 18, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    transform: [{ rotate: '-0.3deg' }],
  },
  
  // Contenedor del carrusel - Centrado absoluto
  carouselContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Área principal del carrusel - Más grande
  carouselMainArea: {
    width: '100%',
    height: scaleByContent(isSmallScreen ? 280 : isTabletScreen ? 480 : 320, 'interactive'),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  
  // Contenedor del modo actual
  currentModeContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Botón del modo - Con padding reducido para contenido compacto
  modeButton: {
    width: isSmallScreen 
      ? Math.min(width * 0.75, scaleByContent(320, 'interactive')) 
      : isTabletScreen 
        ? Math.min(width * 0.6, scaleByContent(450, 'interactive'))
        : Math.min(width * 0.6, scaleByContent(320, 'interactive')),
    height: isSmallScreen 
      ? Math.min(width * 0.45, scaleByContent(200, 'interactive'))
      : isTabletScreen
        ? Math.min(width * 0.35, scaleByContent(300, 'interactive'))
        : Math.min(width * 0.35, scaleByContent(200, 'interactive')),
    paddingHorizontal: scaleByContent(isSmallScreen ? 15 : isTabletScreen ? 25 : 20, 'spacing'),
    paddingVertical: scaleByContent(isSmallScreen ? 12 : isTabletScreen ? 20 : 16, 'spacing'),
    borderRadius: scaleByContent(18, 'spacing'),
    borderTopLeftRadius: scaleByContent(6, 'spacing'),
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(5, 'spacing'), height: scaleByContent(5, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(10, 'spacing'),
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transform: [{ rotate: '-0.8deg' }],
  },
  
  // Botón deshabilitado
  disabledMode: {
    opacity: 0.75,
  },
  
  // Estilos del botón del modo - Más compactos
  modeIcon: {
    fontSize: scaleByContent(isSmallScreen ? 40 : isTabletScreen ? 65 : 52, 'icon'),
    marginBottom: scaleByContent(isSmallScreen ? 1 : isTabletScreen ? 2 : 1.5, 'spacing'),
  },
  
  modeTitle: {
    fontSize: scaleByContent(isSmallScreen ? 18 : isTabletScreen ? 28 : 22, 'text'),
    fontFamily: theme.fonts.primaryBold,
    marginBottom: scaleByContent(0, 'spacing'),
    textAlign: 'center',
    lineHeight: scaleByContent(isSmallScreen ? 20 : isTabletScreen ? 32 : 26, 'text'),
  },
  
  modeDescription: {
    fontSize: scaleByContent(isSmallScreen ? 12 : isTabletScreen ? 18 : 15, 'text'),
    fontFamily: theme.fonts.primary,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: scaleByContent(isSmallScreen ? 14 : isTabletScreen ? 22 : 18, 'text'),
  },
  
  // Badge "Próximamente"
  comingSoonBadge: {
    position: 'absolute',
    top: scaleByContent(-10, 'spacing'),
    right: scaleByContent(-10, 'spacing'),
    backgroundColor: '#FF5722',
    paddingHorizontal: scaleByContent(10, 'spacing'),
    paddingVertical: scaleByContent(4, 'spacing'),
    borderRadius: scaleByContent(12, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    transform: [{ rotate: '15deg' }],
  },
  
  comingSoonText: {
    fontSize: scaleByContent(isSmallScreen ? 10 : isTabletScreen ? 16 : 12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
  
  // Indicadores del carrusel - Más abajo
  carouselIndicators: {
    position: 'absolute',
    bottom: scaleByContent(isSmallScreen ? 10 : isTabletScreen ? 15 : 12, 'spacing'),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleByContent(isSmallScreen ? 15 : isTabletScreen ? 25 : 20, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
  },
  
  // Indicador individual
  indicator: {
    width: scaleByContent(isSmallScreen ? 40 : isTabletScreen ? 60 : 50, 'interactive'),
    height: scaleByContent(isSmallScreen ? 40 : isTabletScreen ? 60 : 50, 'interactive'),
    borderRadius: scaleByContent(isSmallScreen ? 20 : isTabletScreen ? 30 : 25, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.1,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
  },
  
  // Indicador activo
  activeIndicator: {
    backgroundColor: '#000000',
    borderColor: '#000000',
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.3,
  },
  
  // Estilos de indicadores
  indicatorEmoji: {
    fontSize: scaleByContent(isSmallScreen ? 16 : isTabletScreen ? 26 : 20, 'icon'),
    opacity: 0.6,
  },
  
  activeIndicatorEmoji: {
    fontSize: scaleByContent(isSmallScreen ? 18 : isTabletScreen ? 28 : 22, 'icon'),
    opacity: 1,
    color: '#FFFFFF',
  },
  
  // Estilos para el botón de mute - Exactamente como LobbyConfigScreen
  sketchMuteButton: {
    position: 'absolute',
    top: scaleByContent(30, 'spacing'),
    right: scaleByContent(30, 'spacing'),
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
  
  // Estilos del modal personalizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(50, 'spacing'),
  },
  
  modalContainer: {
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
    position: 'relative',
  },
  
  modalPaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: scaleByContent(22, 'spacing'),
    backgroundColor: '#F8F6F0',
    zIndex: -1,
  },
  
  modalLine: {
    position: 'absolute',
    left: scaleByContent(65, 'spacing'),
    right: scaleByContent(15, 'spacing'),
    height: scaleByContent(1, 'spacing'),
    backgroundColor: '#A8C8EC',
    opacity: 0.4,
  },
  
  modalRedLine: {
    position: 'absolute',
    left: scaleByContent(60, 'spacing'),
    top: scaleByContent(15, 'spacing'),
    bottom: scaleByContent(15, 'spacing'),
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },
  
  modalHoles: {
    position: 'absolute',
    left: scaleByContent(25, 'spacing'),
    top: scaleByContent(40, 'spacing'),
    bottom: scaleByContent(40, 'spacing'),
    width: scaleByContent(20, 'spacing'),
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  modalHole: {
    width: scaleByContent(14, 'spacing'),
    height: scaleByContent(14, 'spacing'),
    borderRadius: scaleByContent(7, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(3, 'spacing'),
    elevation: 3,
  },
  
  modalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: scaleByContent(50, 'spacing'),
    paddingRight: scaleByContent(15, 'spacing'),
    paddingTop: scaleByContent(20, 'spacing'),
    paddingBottom: scaleByContent(10, 'spacing'),
    flex: 1,
    minHeight: scaleByContent(250, 'interactive'),
  },
  
  modalIcon: {
    fontSize: scaleByContent(60, 'icon'),
    marginBottom: scaleByContent(15, 'spacing'),
  },
  
  modalTitle: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
    transform: [{ rotate: '0.5deg' }],
  },
  
  modalMessage: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#333333',
    textAlign: 'center',
    marginBottom: scaleByContent(10, 'spacing'),
    lineHeight: scaleByContent(22, 'text'),
  },
  
  modalSubMessage: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginBottom: scaleByContent(25, 'spacing'),
    fontStyle: 'italic',
    lineHeight: scaleByContent(18, 'text'),
  },
  
  modalButton: {
    backgroundColor: '#FFE082',
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(12, 'spacing'),
    borderRadius: scaleByContent(15, 'spacing'),
    borderTopLeftRadius: scaleByContent(5, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
  },
  
  modalButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
});

export default CreateGameScreen;