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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch } from 'react-redux';
import { theme } from '../../styles/theme';
import { setGameMode } from '../../store/gameSlice';

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

const CreateGameScreen = ({ navigation }) => {
  // Redux
  const dispatch = useDispatch();
  
  // Estado para el modo seleccionado
  const [selectedMode, setSelectedMode] = useState(null);
  
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
      
      setTimeout(() => {
        Alert.alert('🎯 ¡Perfecto!', `Modo ${gameMode.title} seleccionado.\n\n¡Iniciando partida!`);
      }, 500);
    } else {
      setTimeout(() => {
        Alert.alert(
          `🔥 Modo ${gameMode.title}`,
          'Este modo estará disponible próximamente.\n¡Mantente atento a las actualizaciones!',
          [{ text: 'Entendido', style: 'default' }]
        );
      }, 200);
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
  content: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 10,
    paddingTop: 40,
    paddingBottom: 120,
    alignItems: 'center',
  },
  
  // Título
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
  
  // Contenedor del carrusel
  carouselContainer: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  
  // Área principal del carrusel
  carouselMainArea: {
    width: '100%',
    height: 320,
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
    width: Math.min(width * 0.7, 320),
    height: Math.min(width * 0.45, 220),
    padding: 20,
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
    transform: [{ rotate: '-0.8deg' }],
  },
  
  // Botón deshabilitado
  disabledMode: {
    opacity: 0.75,
  },
  
  // Estilos del botón del modo
  modeIcon: {
    fontSize: 58,
    marginBottom: 10,
  },
  
  modeTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.primaryBold,
    marginBottom: 6,
    textAlign: 'center',
  },
  
  modeDescription: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    textAlign: 'center',
    opacity: 0.8,
  },
  
  // Badge "Próximamente"
  comingSoonBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FF5722',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    transform: [{ rotate: '15deg' }],
  },
  
  comingSoonText: {
    fontSize: 12,
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
  
  // Indicadores del carrusel
  carouselIndicators: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  
  // Indicador individual
  indicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    fontSize: 20,
    opacity: 0.6,
  },
  
  activeIndicatorEmoji: {
    fontSize: 22,
    opacity: 1,
    color: '#FFFFFF',
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

export default CreateGameScreen;