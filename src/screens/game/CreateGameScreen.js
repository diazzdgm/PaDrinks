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
                  style={[styles.modalLine, { top: 20 + (index * 25) }]} 
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
    top: scaleHeight(isSmallScreen ? 45 : isTabletScreen ? 80 : 60),
    right: scaleWidth(isSmallScreen ? 15 : isTabletScreen ? 30 : 20),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: scale(15),
    borderWidth: 1,
    borderColor: '#DDD',
    zIndex: 1000,
  },
  
  connectionDot: {
    width: scale(isSmallScreen ? 6 : isTabletScreen ? 10 : 8),
    height: scale(isSmallScreen ? 6 : isTabletScreen ? 10 : 8),
    borderRadius: scale(isSmallScreen ? 3 : isTabletScreen ? 5 : 4),
    marginRight: scaleWidth(6),
  },
  
  connectionText: {
    fontSize: isSmallScreen ? scaleText(10) : isTabletScreen ? scaleText(16) : scaleText(12),
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
    top: scaleHeight(isSmallScreen ? 30 : isTabletScreen ? 50 : 40),
    left: scaleWidth(isSmallScreen ? 20 : isTabletScreen ? 40 : 30),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scaleWidth(isSmallScreen ? 15 : isTabletScreen ? 25 : 20),
    paddingVertical: scaleHeight(isSmallScreen ? 8 : isTabletScreen ? 12 : 10),
    borderRadius: scale(15),
    borderTopLeftRadius: scale(5),
    borderWidth: scale(2),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scale(2), height: scale(2) },
    shadowOpacity: 0.25,
    shadowRadius: scale(4),
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
    zIndex: 10,
  },
  
  backButtonText: {
    fontSize: isSmallScreen ? scaleText(14) : isTabletScreen ? scaleText(20) : scaleText(16),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Contenido principal
  content: {
    flex: 1,
    paddingHorizontal: scaleWidth(isSmallScreen ? 25 : isTabletScreen ? 60 : 40),
    paddingVertical: scaleHeight(isSmallScreen ? 8 : isTabletScreen ? 15 : 10),
    paddingTop: scaleHeight(isSmallScreen ? 30 : isTabletScreen ? 50 : 40),
    paddingBottom: scaleHeight(isSmallScreen ? 100 : isTabletScreen ? 140 : 120),
    alignItems: 'center',
  },
  
  // Título
  titleContainer: {
    alignItems: 'center',
    marginBottom: scaleHeight(isSmallScreen ? 15 : isTabletScreen ? 25 : 20),
    marginTop: scaleHeight(isSmallScreen ? 8 : isTabletScreen ? 12 : 10),
  },
  
  title: {
    fontSize: isSmallScreen ? scaleText(26) : isTabletScreen ? scaleText(42) : scaleText(32),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleHeight(8),
    transform: [{ rotate: '0.5deg' }],
  },
  
  subtitle: {
    fontSize: isSmallScreen ? scaleText(15) : isTabletScreen ? scaleText(24) : scaleText(18),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    transform: [{ rotate: '-0.3deg' }],
  },
  
  // Contenedor del carrusel
  carouselContainer: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleHeight(isSmallScreen ? 25 : isTabletScreen ? 50 : 40),
  },
  
  // Área principal del carrusel
  carouselMainArea: {
    width: '100%',
    height: isSmallScreen ? scaleHeight(240) : isTabletScreen ? scaleHeight(420) : scaleHeight(320),
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
  
  // Botón del modo
  modeButton: {
    width: isSmallScreen 
      ? Math.min(width * 0.8, scaleWidth(280)) 
      : isTabletScreen 
        ? Math.min(width * 0.6, scaleWidth(400))
        : Math.min(width * 0.7, scaleWidth(320)),
    height: isSmallScreen 
      ? Math.min(width * 0.5, scaleHeight(180))
      : isTabletScreen
        ? Math.min(width * 0.35, scaleHeight(280))
        : Math.min(width * 0.45, scaleHeight(220)),
    padding: scaleWidth(isSmallScreen ? 15 : isTabletScreen ? 25 : 20),
    borderRadius: scale(18),
    borderTopLeftRadius: scale(6),
    borderWidth: scale(3),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scale(5), height: scale(5) },
    shadowOpacity: 0.25,
    shadowRadius: scale(10),
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
  
  // Estilos del botón del modo
  modeIcon: {
    fontSize: isSmallScreen ? scaleText(46) : isTabletScreen ? scaleText(74) : scaleText(58),
    marginBottom: scaleHeight(isSmallScreen ? 8 : isTabletScreen ? 12 : 10),
  },
  
  modeTitle: {
    fontSize: isSmallScreen ? scaleText(20) : isTabletScreen ? scaleText(32) : scaleText(24),
    fontFamily: theme.fonts.primaryBold,
    marginBottom: scaleHeight(6),
    textAlign: 'center',
  },
  
  modeDescription: {
    fontSize: isSmallScreen ? scaleText(13) : isTabletScreen ? scaleText(20) : scaleText(16),
    fontFamily: theme.fonts.primary,
    textAlign: 'center',
    opacity: 0.8,
  },
  
  // Badge "Próximamente"
  comingSoonBadge: {
    position: 'absolute',
    top: scaleHeight(-10),
    right: scaleWidth(-10),
    backgroundColor: '#FF5722',
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(4),
    borderRadius: scale(12),
    borderWidth: scale(2),
    borderColor: '#000000',
    transform: [{ rotate: '15deg' }],
  },
  
  comingSoonText: {
    fontSize: isSmallScreen ? scaleText(10) : isTabletScreen ? scaleText(16) : scaleText(12),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
  
  // Indicadores del carrusel
  carouselIndicators: {
    position: 'absolute',
    bottom: scaleHeight(isSmallScreen ? 20 : isTabletScreen ? 40 : 30),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleWidth(isSmallScreen ? 15 : isTabletScreen ? 25 : 20),
    paddingHorizontal: scaleWidth(20),
  },
  
  // Indicador individual
  indicator: {
    width: isSmallScreen ? scale(40) : isTabletScreen ? scale(60) : scale(50),
    height: isSmallScreen ? scale(40) : isTabletScreen ? scale(60) : scale(50),
    borderRadius: isSmallScreen ? scale(20) : isTabletScreen ? scale(30) : scale(25),
    backgroundColor: '#FFFFFF',
    borderWidth: scale(2),
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scale(2), height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
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
    fontSize: isSmallScreen ? scaleText(16) : isTabletScreen ? scaleText(26) : scaleText(20),
    opacity: 0.6,
  },
  
  activeIndicatorEmoji: {
    fontSize: isSmallScreen ? scaleText(18) : isTabletScreen ? scaleText(28) : scaleText(22),
    opacity: 1,
    color: '#FFFFFF',
  },
  
  // Estilos para el botón de mute
  sketchMuteButton: {
    position: 'absolute',
    top: scaleHeight(isSmallScreen ? 20 : isTabletScreen ? 40 : 30),
    right: scaleWidth(isSmallScreen ? 20 : isTabletScreen ? 40 : 30),
    width: scaleModerate(isSmallScreen ? 55 : isTabletScreen ? 85 : 70, 0.3),
    height: scaleModerate(isSmallScreen ? 55 : isTabletScreen ? 85 : 70, 0.3),
    borderRadius: scaleModerate(isSmallScreen ? 27.5 : isTabletScreen ? 42.5 : 35, 0.3),
    backgroundColor: '#FFFFFF',
    borderWidth: scale(3),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scale(3), height: scale(3) },
    shadowOpacity: 0.25,
    shadowRadius: scale(4),
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
  
  // Estilos del modal personalizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  modalContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: scale(25),
    padding: scaleWidth(isSmallScreen ? 20 : isTabletScreen ? 30 : 25),
    maxWidth: isSmallScreen ? scaleWidth(320) : isTabletScreen ? scaleWidth(480) : scaleWidth(380),
    width: '85%',
    minHeight: isSmallScreen ? scaleHeight(250) : isTabletScreen ? scaleHeight(360) : scaleHeight(300),
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: scale(15),
    },
    shadowOpacity: 0.4,
    shadowRadius: scale(25),
    elevation: 20,
    borderWidth: scale(3),
    borderColor: '#000000',
  },
  
  modalPaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22, // Ligeramente menor que el container
    backgroundColor: '#F8F6F0', // Asegurar fondo sólido
    zIndex: -1,
  },
  
  modalLine: {
    position: 'absolute',
    left: 65,
    right: 15,
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.4,
  },
  
  modalRedLine: {
    position: 'absolute',
    left: 60,
    top: 15,
    bottom: 15,
    width: 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },
  
  modalHoles: {
    position: 'absolute',
    left: 25,
    top: 40,
    bottom: 40,
    width: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  modalHole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  
  modalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 50, // Espacio para los agujeros y línea roja
    paddingRight: 15,
    paddingTop: 20,
    paddingBottom: 10,
    flex: 1,
    minHeight: 250,
  },
  
  modalIcon: {
    fontSize: isSmallScreen ? scaleText(48) : isTabletScreen ? scaleText(72) : scaleText(60),
    marginBottom: scaleHeight(15),
  },
  
  modalTitle: {
    fontSize: isSmallScreen ? scaleText(20) : isTabletScreen ? scaleText(30) : scaleText(24),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleHeight(15),
    transform: [{ rotate: '0.5deg' }],
  },
  
  modalMessage: {
    fontSize: isSmallScreen ? scaleText(15) : isTabletScreen ? scaleText(22) : scaleText(18),
    fontFamily: theme.fonts.primary,
    color: '#333333',
    textAlign: 'center',
    marginBottom: scaleHeight(10),
    lineHeight: isSmallScreen ? scaleHeight(20) : isTabletScreen ? scaleHeight(30) : scaleHeight(24),
  },
  
  modalSubMessage: {
    fontSize: isSmallScreen ? scaleText(13) : isTabletScreen ? scaleText(20) : scaleText(16),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginBottom: scaleHeight(25),
    fontStyle: 'italic',
  },
  
  modalButton: {
    backgroundColor: '#FFE082',
    paddingHorizontal: scaleWidth(isSmallScreen ? 25 : isTabletScreen ? 40 : 30),
    paddingVertical: scaleHeight(isSmallScreen ? 10 : isTabletScreen ? 15 : 12),
    borderRadius: scale(15),
    borderTopLeftRadius: scale(5),
    borderWidth: scale(2),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scale(3), height: scale(3) },
    shadowOpacity: 0.25,
    shadowRadius: scale(4),
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
  },
  
  modalButtonText: {
    fontSize: isSmallScreen ? scaleText(14) : isTabletScreen ? scaleText(20) : scaleText(16),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
});

export default CreateGameScreen;