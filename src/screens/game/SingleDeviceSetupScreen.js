import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import audioService from '../../services/AudioService';
import { Haptics } from '../../utils/platform';
import { useDispatch } from 'react-redux';
import { theme } from '../../styles/theme';
import { useSafeAreaOffsets } from '../../hooks/useSafeAreaOffsets';
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

const SingleDeviceSetupScreen = ({ navigation, route }) => {
  // Redux
  const dispatch = useDispatch();

  // Safe area offsets para iOS
  const { leftOffset, rightOffset, topOffset } = useSafeAreaOffsets();

  // Estados
  const [playerCount, setPlayerCount] = useState(4); // Default 4 jugadores
  const [savedDraftPlayers, setSavedDraftPlayers] = useState({});
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(-50)).current;
  const selectorAnim = useRef(new Animated.Value(50)).current;
  const buttonAnim = useRef(new Animated.Value(100)).current;
  
  // audioService gestiona los sonidos automáticamente
  
  // Estado y animación para el botón de mute
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const muteButtonScale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    React.useCallback(() => {
      // Sincronizar estado de mute cuando regresamos a la pantalla
      setIsMuted(audioService.isMusicMuted);
      
      // Capturar draftPlayers si vienen de MultiPlayerRegistration
      if (route.params?.draftPlayers) {
        setSavedDraftPlayers(route.params.draftPlayers);
        console.log(`📋 Capturando draftPlayers en SingleDevice:`, route.params.draftPlayers);
      }
      
      // Animaciones de entrada
      startEntranceAnimations();
      
      return () => {
        // audioService gestiona automáticamente la limpieza
      };
    }, [route.params?.draftPlayers])
  );

  // audioService gestiona automáticamente la limpieza de sonidos
  // No necesitamos cleanupSound manual

  const startEntranceAnimations = () => {
    // Resetear valores
    fadeAnim.setValue(0);
    titleAnim.setValue(-50);
    selectorAnim.setValue(50);
    buttonAnim.setValue(100);

    // Animaciones escalonadas
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(titleAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 200);

    setTimeout(() => {
      Animated.timing(selectorAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 400);

    setTimeout(() => {
      Animated.timing(buttonAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 600);
  };

  const playBeerSound = async () => {
    await audioService.playSoundEffect('beer');
  };

  const playWinePopSound = async () => {
    await audioService.playSoundEffect('wine');
  };

  const handlePlayerCountChange = (newCount) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playWinePopSound();
    setPlayerCount(newCount);
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
    playBeerSound(); // Es navegación, usa beer sound

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    navigation.goBack();
  };

  const handleStartGame = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playBeerSound(); // Es navegación, mantiene beer sound
    
    // Datos del juego
    const gameData = {
      mode: 'single-device',
      playerCount,
    };
    
    console.log('Iniciando juego:', gameData);
    
    // Usar los draftPlayers guardados en el estado local
    // Esto permite mantener datos de jugadores al cambiar playerCount
    console.log(`🎮 Iniciando juego con ${playerCount} jugadores`);
    console.log(`📋 Borradores guardados:`, Object.keys(savedDraftPlayers).length > 0 ? Object.keys(savedDraftPlayers) : 'Ninguno');
    
    // Navegar a MultiPlayerRegistrationScreen para registrar jugadores
    navigation.navigate('MultiPlayerRegistration', { 
      gameMode: 'single-device',
      playerCount,
      draftPlayers: savedDraftPlayers // Usar los datos guardados en estado local
    });
  };

  // Generar números de jugadores (3-16)
  const playerNumbers = Array.from({ length: 14 }, (_, i) => i + 3);

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
            size={scaleModerate(50, 0.3)}
            isMuted={isMuted}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Título */}
        <Animated.View 
          style={[
            styles.titleContainer,
            { transform: [{ translateY: titleAnim }] }
          ]}
        >
          <Text style={styles.title}>UN SOLO DISPOSITIVO</Text>
          <Text style={styles.subtitle}>¿Cuántos van a jugar?</Text>
        </Animated.View>

        {/* Selector de jugadores */}
        <Animated.View 
          style={[
            styles.selectorContainer,
            { transform: [{ translateY: selectorAnim }] }
          ]}
        >
          <View style={styles.playerCountDisplay}>
            <Text style={styles.playerCountNumber}>{playerCount}</Text>
            <Text style={styles.playerCountLabel}>
              {playerCount === 1 ? 'Jugador' : 'Jugadores'}
            </Text>
          </View>

          {/* Grid de números */}
          <View style={styles.numbersGrid}>
            {playerNumbers.map((number) => (
              <TouchableOpacity
                key={number}
                style={[
                  styles.numberButton,
                  playerCount === number && styles.selectedNumberButton,
                ]}
                onPress={() => handlePlayerCountChange(number)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.numberButtonText,
                  playerCount === number && styles.selectedNumberButtonText,
                ]}>
                  {number}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Botón de iniciar - Flecha circular en esquina inferior derecha */}
        <Animated.View 
          style={[
            styles.startButtonContainer,
            { transform: [{ translateY: buttonAnim }] }
          ]}
        >
          <TouchableOpacity
            style={styles.startArrowButton}
            onPress={handleStartGame}
            activeOpacity={0.8}
          >
            <Image 
              source={require('../../../assets/images/Arrow.Sketch.png')}
              style={styles.startArrowImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

// Obtener información del dispositivo para estilos dinámicos
const deviceType = getDeviceType();
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();
const screenHeight = getScreenHeight();
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
    height: 1,
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
    width: scaleByContent(18, 'icon'),
    height: scaleByContent(18, 'icon'),
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
  
  // Botón de regreso
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(120, 'spacing'),
    paddingVertical: isShortHeight ? scaleByContent(10, 'spacing') : scaleByContent(20, 'spacing'),
    paddingTop: isShortHeight ? scaleByContent(20, 'spacing') : (Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? scaleByContent(20, 'spacing') : scaleByContent(80, 'spacing')),
  },

  // Título
  titleContainer: {
    alignItems: 'center',
    marginBottom: isShortHeight ? scaleByContent(15, 'spacing') : scaleByContent(40, 'spacing'),
    marginTop: isShortHeight ? 0 : scaleByContent(-40, 'spacing'),
  },
  
  title: {
    fontSize: scaleByContent(26, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(5, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },
  
  subtitle: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
    transform: [{ rotate: '0deg' }],
  },
  
  // Selector de jugadores
  selectorContainer: {
    alignItems: 'center',
    marginBottom: isShortHeight ? scaleByContent(10, 'spacing') : scaleByContent(20, 'spacing'),
    marginTop: isShortHeight ? 0 : scaleByContent(-25, 'spacing'),
  },

  playerCountDisplay: {
    backgroundColor: theme.colors.postItYellow,
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    borderRadius: scaleBorder(20),
    borderTopLeftRadius: scaleBorder(5),
    paddingVertical: isShortHeight ? scaleByContent(12, 'spacing') : scaleByContent(20, 'spacing'),
    paddingHorizontal: isShortHeight ? scaleByContent(20, 'spacing') : scaleByContent(30, 'spacing'),
    alignItems: 'center',
    marginBottom: isShortHeight ? scaleByContent(15, 'spacing') : scaleByContent(30, 'spacing'),
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(4, 'spacing'), height: scaleByContent(4, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(8, 'spacing'),
    elevation: 6,
    transform: [{ rotate: '0deg' }],
  },
  
  playerCountNumber: {
    fontSize: isShortHeight ? scaleByContent(36, 'text') : scaleByContent(48, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
  },

  playerCountLabel: {
    fontSize: isShortHeight ? scaleByContent(14, 'text') : scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    marginTop: isShortHeight ? scaleByContent(2, 'spacing') : scaleByContent(5, 'spacing'),
  },
  
  // Grid de números
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isShortHeight ? scaleByContent(6, 'spacing') : scaleByContent(10, 'spacing'),
    maxWidth: scaleByContent(400, 'interactive'),
  },

  numberButton: {
    width: isShortHeight ? scaleByContent(36, 'interactive') : scaleByContent(42, 'interactive'),
    height: isShortHeight ? scaleByContent(36, 'interactive') : scaleByContent(42, 'interactive'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: isShortHeight ? scaleByContent(18, 'spacing') : scaleByContent(21, 'spacing'),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.15,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
    transform: [{ rotate: '0deg' }],
  },

  selectedNumberButton: {
    backgroundColor: theme.colors.postItGreen,
    transform: [{ rotate: '0deg' }, { scale: 1.1 }],
    borderWidth: scaleBorder(3),
  },
  
  numberButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  selectedNumberButtonText: {
    color: '#2E2E2E',
  },
  
  // Botón de iniciar - Flecha circular
  startButtonContainer: {
    position: 'absolute',
    bottom: scaleByContent(30, 'spacing'),
    right: scaleByContent(30, 'spacing'),
  },

  startArrowButton: {
    width: scaleByContent(60, 'interactive'),
    height: scaleByContent(60, 'interactive'),
    backgroundColor: theme.colors.postItGreen,
    borderRadius: scaleBorder(30),
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(4, 'spacing'), height: scaleByContent(4, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(8, 'spacing'),
    elevation: 8,
    transform: [{ rotate: '5deg' }],
    zIndex: 10,
  },

  startArrowImage: {
    width: scaleByContent(35, 'icon'),
    height: scaleByContent(35, 'icon'),
  },
  
  // Estilos para el botón de mute
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
});

export default SingleDeviceSetupScreen;