import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../../styles/theme';
import { useSafeAreaOffsets } from '../../hooks/useSafeAreaOffsets';
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
  scaleBorder,
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

  // Safe area offsets para iOS
  const { leftOffset, rightOffset, topOffset } = useSafeAreaOffsets();

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
        // AudioService maneja la limpieza automáticamente
      };
    }, [])
  );


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

  const handleModeSelect = async (mode, index) => {
    try {
      // Prevenir click si acabamos de hacer un swipe
      if (isSwipeInProgress) {
        console.log('Click bloqueado - swipe en progreso');
        return;
      }

      const gameMode = gameModes[index];

      if (!gameMode) {
        console.log('Game mode not found at index:', index);
        return;
      }

      console.log('🎮 Mode selected:', gameMode.id, 'Available:', gameMode.available);

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.log('Haptics not available:', error);
      }

      try {
        await playBeerSound();
      } catch (error) {
        console.log('Error playing sound:', error);
      }

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
        console.log('📱 Showing coming soon modal for:', gameMode.title);

        // Primero establecer los estados
        const modalInfo = {
          id: gameMode.id,
          icon: gameMode.icon,
          title: gameMode.title,
          description: gameMode.description,
          color: gameMode.color,
          textColor: gameMode.textColor,
          available: gameMode.available
        };

        console.log('📱 Modal info prepared:', modalInfo);

        // Resetear animaciones antes de mostrar
        modalScale.setValue(0.3);
        modalOpacity.setValue(0);

        // Establecer info del modal
        setModalModeInfo(modalInfo);

        console.log('📱 About to show modal...');

        // Mostrar modal con setTimeout para asegurar que el estado se actualice
        setTimeout(() => {
          try {
            console.log('📱 Setting modal visible...');
            setShowComingSoonModal(true);

            // Animar después de que el modal esté visible
            setTimeout(() => {
              try {
                console.log('📱 Starting animation...');
                Animated.parallel([
                  Animated.timing(modalScale, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                  Animated.timing(modalOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                  }),
                ]).start();
                console.log('📱 Animation started successfully');
              } catch (animError) {
                console.error('❌ Error animating modal:', animError);
              }
            }, 50);
          } catch (modalError) {
            console.error('❌ Error showing modal:', modalError);
          }
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error in handleModeSelect:', error);
      console.error('Error stack:', error.stack);

      // Fallback simple sin animaciones
      try {
        setModalModeInfo({
          id: 'fallback',
          icon: '🎮',
          title: 'Próximamente',
          description: 'Este modo estará disponible próximamente.',
          color: '#FFE082',
          textColor: '#2E2E2E',
          available: false
        });
        setShowComingSoonModal(true);
      } catch (fallbackError) {
        console.error('❌ Even fallback failed:', fallbackError);
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

  const handleGoBack = async () => {
    await playBeerSound();

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            size={scaleModerate(50, 0.3)}
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
      
      {/* Overlay absoluto en lugar de Modal para iOS */}
      {showComingSoonModal && modalModeInfo && (
        <View style={styles.absoluteOverlay}>
          <View style={styles.modalContainerSimple}>
            <Text style={styles.modalIconSimple}>{modalModeInfo.icon}</Text>
            <Text style={styles.modalTitleSimple}>Modo {modalModeInfo.title}</Text>
            <Text style={styles.modalMessageSimple}>
              Este modo estará disponible próximamente.
            </Text>
            <Text style={styles.modalSubMessageSimple}>
              ¡Mantente atento a las actualizaciones!
            </Text>

            <TouchableOpacity
              style={styles.modalButtonSimple}
              onPress={handleCloseModal}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonTextSimple}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// Obtener información del dispositivo para estilos dinámicos
const width = SCREEN_WIDTH;
const height = SCREEN_HEIGHT;
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
  
  // Indicador de conexión
  connectionIndicator: {
    position: 'absolute',
    top: scaleByContent(30, 'spacing'),
    right: scaleByContent(isSmallScreen ? 100 : 110, 'spacing'),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: scaleByContent(12, 'spacing'),
    paddingVertical: scaleByContent(6, 'spacing'),
    borderRadius: scaleBorder(15),
    borderWidth: scaleBorder(2),
    borderColor: '#000000', // Contorno negro
    zIndex: 1000,
  },
  
  connectionDot: {
    width: scaleByContent(isSmallScreen ? 6 : 8, 'spacing'),
    height: scaleByContent(isSmallScreen ? 6 : 8, 'spacing'),
    borderRadius: scaleBorder(isSmallScreen ? 3 : 4),
    marginRight: scaleByContent(6, 'spacing'),
  },
  
  connectionText: {
    fontSize: scaleByContent(isSmallScreen ? 10 : 12, 'text'),
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
  
  // Botón de regreso - Exactamente como LobbyConfigScreen
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
  
  // Contenido principal
  content: {
    flex: 1,
    paddingHorizontal: scaleByContent(isSmallScreen ? 25 : isTabletScreen ? 60 : 40, 'spacing'),
    paddingTop: isTabletScreen ? 120 : scaleByContent(100, 'spacing'),
    paddingBottom: scaleByContent(isTabletScreen ? 30 : 100, 'spacing'),
    justifyContent: isTabletScreen ? 'flex-start' : 'center',
    alignItems: 'center',
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: scaleByContent(isSmallScreen ? 20 : isTabletScreen ? 10 : 25, 'spacing'),
    ...(isTabletScreen ? {} : { position: 'absolute', top: scaleByContent(20, 'spacing') }),
    left: 0,
    right: 0,
    zIndex: 5,
  },

  title: {
    fontSize: scaleByContent(isSmallScreen ? 26 : 32, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },
  
  subtitle: {
    fontSize: scaleByContent(isSmallScreen ? 15 : 18, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    transform: [{ rotate: '0deg' }],
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
    height: scaleByContent(isSmallScreen ? 280 : 320, 'interactive'),
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
      : Math.min(width * 0.6, scaleByContent(320, 'interactive')),
    height: isSmallScreen
      ? Math.min(width * 0.45, scaleByContent(200, 'interactive'))
      : Math.min(width * 0.35, scaleByContent(200, 'interactive')),
    paddingHorizontal: scaleByContent(isSmallScreen ? 15 : 20, 'spacing'),
    paddingVertical: scaleByContent(isSmallScreen ? 12 : 16, 'spacing'),
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
    transform: [{ rotate: '0deg' }],
  },
  
  // Botón deshabilitado
  disabledMode: {
    opacity: 0.75,
  },
  
  // Estilos del botón del modo - Más compactos
  modeIcon: {
    fontSize: scaleByContent(isSmallScreen ? 40 : 52, 'icon'),
    marginBottom: scaleByContent(isSmallScreen ? 6 : 8, 'spacing'),
  },

  modeTitle: {
    fontSize: scaleByContent(isSmallScreen ? 18 : 22, 'text'),
    fontFamily: theme.fonts.primaryBold,
    marginBottom: scaleByContent(4, 'spacing'),
    textAlign: 'center',
    lineHeight: scaleByContent(isSmallScreen ? 24 : 28, 'text'),
    includeFontPadding: false,
  },

  modeDescription: {
    fontSize: scaleByContent(isSmallScreen ? 12 : 15, 'text'),
    fontFamily: theme.fonts.primary,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: scaleByContent(isSmallScreen ? 18 : 22, 'text'),
    includeFontPadding: false,
  },
  
  // Badge "Próximamente"
  comingSoonBadge: {
    position: 'absolute',
    top: scaleByContent(-10, 'spacing'),
    right: scaleByContent(-10, 'spacing'),
    backgroundColor: '#FF5722',
    paddingHorizontal: scaleByContent(10, 'spacing'),
    paddingVertical: scaleByContent(4, 'spacing'),
    borderRadius: scaleBorder(12),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    transform: [{ rotate: '15deg' }],
  },
  
  comingSoonText: {
    fontSize: scaleByContent(isSmallScreen ? 10 : 12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
  
  // Indicadores del carrusel - Más abajo
  carouselIndicators: {
    position: 'absolute',
    bottom: scaleByContent(isSmallScreen ? 10 : 12, 'spacing'),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleByContent(isSmallScreen ? 15 : 20, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
  },
  
  // Indicador individual
  indicator: {
    width: scaleByContent(isSmallScreen ? 40 : 50, 'interactive'),
    height: scaleByContent(isSmallScreen ? 40 : 50, 'interactive'),
    borderRadius: scaleBorder(isSmallScreen ? 20 : 25),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
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
    fontSize: scaleByContent(isSmallScreen ? 16 : 20, 'icon'),
    opacity: 0.6,
  },

  activeIndicatorEmoji: {
    fontSize: scaleByContent(isSmallScreen ? 18 : 22, 'icon'),
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
    borderRadius: scaleBorder(35),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
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
    transform: [{ rotate: '0deg' }],
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
    borderRadius: scaleBorder(2),
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

  // Overlay absoluto para reemplazar Modal
  absoluteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  
  modalContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: scaleBorder(25),
    padding: scaleByContent(20, 'spacing'),
    maxWidth: scaleByContent(500, 'interactive'),
    width: '90%',
    minHeight: scaleByContent(280, 'interactive'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleByContent(10, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(20, 'spacing'),
    elevation: 20,
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    borderTopLeftRadius: scaleBorder(5),
    transform: [{ rotate: '0deg' }],
    position: 'relative',
  },
  
  modalPaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: scaleBorder(22),
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
    borderRadius: scaleBorder(7),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
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
    transform: [{ rotate: '0deg' }],
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
    borderRadius: scaleBorder(15),
    borderTopLeftRadius: scaleBorder(5),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
    transform: [{ rotate: '0deg' }],
  },
  
  modalButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },

  // Estilos simplificados para iOS
  modalContainerSimple: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleBorder(20),
    padding: scaleByContent(30, 'spacing'),
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: scaleByContent(400, 'interactive'),
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleByContent(4, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(10, 'spacing'),
    elevation: 10,
  },

  modalIconSimple: {
    fontSize: scaleByContent(60, 'icon'),
    marginBottom: scaleByContent(20, 'spacing'),
  },

  modalTitleSimple: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
  },

  modalMessageSimple: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#333333',
    textAlign: 'center',
    marginBottom: scaleByContent(10, 'spacing'),
    lineHeight: scaleByContent(22, 'text'),
  },

  modalSubMessageSimple: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginBottom: scaleByContent(25, 'spacing'),
    fontStyle: 'italic',
    lineHeight: scaleByContent(18, 'text'),
  },

  modalButtonSimple: {
    backgroundColor: '#FFE082',
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(12, 'spacing'),
    borderRadius: scaleBorder(15),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
  },

  modalButtonTextSimple: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
});

export default CreateGameScreen;