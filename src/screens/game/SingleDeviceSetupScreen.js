import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch } from 'react-redux';
import { theme } from '../../styles/theme';
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
  isShortHeightDevice,
  getScreenHeight,
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

const SingleDeviceSetupScreen = ({ navigation, route }) => {
  // Redux
  const dispatch = useDispatch();
  
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
    // audioService gestiona automáticamente la limpieza, no necesitamos guardar referencia
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
          {[...Array(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 45 : 20)].map((_, index) => (
            <View 
              key={index} 
              style={[styles.line, { top: (Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 20 : 40) + (index * (Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 18 : 25)) }]} 
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
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const { width, height } = Dimensions.get('window');
const deviceType = getDeviceType();
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();
const screenHeight = getScreenHeight();

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
    marginBottom: isShortHeight ? 15 : 40,
    marginTop: isShortHeight ? 0 : -60,
  },
  
  title: {
    fontSize: scaleByContent(26, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 5,
    transform: [{ rotate: '0.5deg' }],
  },
  
  subtitle: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
    transform: [{ rotate: '-0.3deg' }],
  },
  
  // Selector de jugadores
  selectorContainer: {
    alignItems: 'center',
    marginBottom: isShortHeight ? 10 : 20,
    marginTop: isShortHeight ? 0 : -40,
  },

  playerCountDisplay: {
    backgroundColor: theme.colors.postItYellow,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 20,
    borderTopLeftRadius: 5,
    paddingVertical: isShortHeight ? 12 : 20,
    paddingHorizontal: isShortHeight ? 20 : 30,
    alignItems: 'center',
    marginBottom: isShortHeight ? 15 : 30,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ rotate: '-1deg' }],
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
    marginTop: isShortHeight ? 2 : 5,
  },
  
  // Grid de números
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isShortHeight ? 6 : 10,
    maxWidth: 400,
  },

  numberButton: {
    width: isShortHeight ? 36 : 42,
    height: isShortHeight ? 36 : 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: isShortHeight ? 18 : 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ rotate: '-1deg' }],
  },
  
  selectedNumberButton: {
    backgroundColor: theme.colors.postItGreen,
    transform: [{ rotate: '0deg' }, { scale: 1.1 }],
    borderWidth: 3,
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
    bottom: 30,
    right: 30,
  },
  
  startArrowButton: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.postItGreen,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ rotate: '5deg' }],
    zIndex: 10,
  },
  
  startArrowImage: {
    width: 35,
    height: 35,
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

export default SingleDeviceSetupScreen;