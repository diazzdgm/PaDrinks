import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import CircularText from '../../components/common/CircularText';
import audioService from '../../services/AudioService';
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

// Obtener información del dispositivo para estilos dinámicos
const deviceType = getDeviceType();
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const notebookLineSpacing = isTabletScreen ? 15 : scaleByContent(25, 'spacing');
const notebookLineCount = Math.ceil(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / notebookLineSpacing) + 2;

const SplashScreen = ({ navigation }) => {
  // Animaciones
  const logoTranslateY = useRef(new Animated.Value(-200)).current; // Empieza menos arriba
  const logoScale = useRef(new Animated.Value(0.1)).current; // Empieza con tamaño mínimo visible
  const logoRotate = useRef(new Animated.Value(0)).current;
  const paperLinesOpacity = useRef(new Animated.Value(0)).current;
  const paperParallax = useRef(new Animated.Value(0)).current;
  
  // Referencias para el sonido
  const sound = useRef(null);

  useEffect(() => {
    startSplashSequence();
    
    // Empezar fade out del audio a los 5 segundos
    const fadeOutTimer = setTimeout(async () => {
      if (sound.current) {
        try {
          // Fade out gradual durante 1 segundo
          const fadeOutDuration = 1000;
          const steps = 20;
          const stepDuration = fadeOutDuration / steps;
          const volumeStep = 0.8 / steps; // De 0.8 a 0
          
          for (let i = 0; i < steps; i++) {
            const newVolume = 0.8 - (volumeStep * (i + 1));
            await sound.current.setVolumeAsync(Math.max(0, newVolume));
            await new Promise(resolve => setTimeout(resolve, stepDuration));
          }
        } catch (error) {
          console.log('Error during fade out:', error);
        }
      }
    }, 5000);
    
    // Navegar después de 6 segundos
    const timer = setTimeout(() => {
      cleanup();
      navigation.replace('AgeVerification');
    }, 6000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeOutTimer);
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    // Limpiar el sonido
    if (sound.current) {
      try {
        await sound.current.unloadAsync();
      } catch (error) {
        console.log('Error cleaning up sound:', error);
      }
    }
  };

  const loadAndPlaySound = async () => {
    try {
      // Usar audioService para manejar el sonido respetando el mute
      const soundObject = await audioService.playSoundEffect(
        require('../../../assets/sounds/pouring.shot.mp3'),
        { 
          shouldPlay: false, // No reproducir automáticamente
          volume: 0.8 
        }
      );
      
      if (soundObject) {
        sound.current = soundObject;
        
        // Reproducir desde el segundo 4 (4000ms)
        await soundObject.setPositionAsync(4000);
        await soundObject.playAsync();
        
        console.log('🔊 Reproduciendo sonido desde el segundo 4...');
      }
      
    } catch (error) {
      console.log('Error loading sound:', error);
      // Si falla, continuar sin sonido
    }
  };

  const startSplashSequence = async () => {
    // Efecto parallax del fondo
    Animated.loop(
      Animated.sequence([
        Animated.timing(paperParallax, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(paperParallax, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    
    // Secuencia principal de animaciones (6 segundos total)
    Animated.sequence([
      // 1. Fondo de papel aparece suavemente (0.5s)
      Animated.timing(paperLinesOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      
      // 2. Logo CAE desde arriba con bounce dramático (1.2s)
      Animated.parallel([
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      // 3. Mantener logo visible (4.3s)
      Animated.delay(4300),
      
    ]).start();
    
    // Vibración cuando aparece el logo (después de 0.8s)
    setTimeout(() => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }, 800);

    // Animación de rotación continua estilo cómic
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800, // Rotación rápida
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: -1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(1000), // Pausa antes de repetir
      ])
    ).start();

    // Iniciar sonido al segundo 1
    setTimeout(() => {
      loadAndPlaySound();
    }, 1000);
  };


  return (
    <View style={styles.container}>
      {/* Fondo de papel con líneas y efecto parallax */}
      <Animated.View 
        style={[
          styles.paperBackground,
          {
            opacity: paperLinesOpacity,
            transform: [
              {
                translateX: paperParallax.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 3], // Movimiento sutil
                }),
              },
              {
                translateY: paperParallax.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
            ],
          }
        ]}
      >
        {/* Líneas de libreta horizontales */}
        <View style={styles.notebookLines}>
          {[...Array(notebookLineCount)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.line,
                { top: notebookLineSpacing + (index * notebookLineSpacing) }
              ]}
            />
          ))}
        </View>
        
        {/* Línea vertical roja (margen) */}
        <View style={styles.redMarginLine} />
        
        {/* Perforaciones de libreta */}
        <View style={styles.holesPunch}>
          {[...Array(8)].map((_, index) => (
            <View key={index} style={styles.hole} />
          ))}
        </View>
      </Animated.View>

      {/* Contenido principal */}
      <View style={styles.content}>

        {/* Container centralizado para logo y texto circular */}
        <View style={styles.centerContainer}>

          {/* Shot logo grande que CAE desde arriba */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [
                  { translateY: logoTranslateY },
                  { scale: logoScale },
                  {
                    rotate: logoRotate.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: ['-8deg', '0deg', '8deg'],
                    })
                  },
                ],
              },
            ]}
          >

            <View style={styles.shotContainer}>
              <Image
                source={require('../../../assets/images/shot-logo.png')}
                style={styles.shotLogo}
                resizeMode="contain"
              />
            </View>

          </Animated.View>

          {/* Texto circular girando alrededor del logo - Más cerca */}
          <View style={styles.circularTextWrapper}>
            <CircularText
              text="PADRINKS*PADRINKS*PADRINKS*"
              spinDuration={20000}
              radius={150}
              fontSize={22}
              style={styles.circularTextContainer}
              enableDancing={true}
            />
          </View>

        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F0', // Color papel crema
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
  
  // Líneas de libreta
  notebookLines: {
    position: 'absolute',
    top: 0,
    left: scaleByContent(100, 'spacing'), // Después de agujeros y margen
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
  
  // Línea roja del margen
  redMarginLine: {
    position: 'absolute',
    left: scaleByContent(95, 'spacing'),
    top: 0,
    bottom: 0,
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
    opacity: 0.5,
  },
  
  // Agujeros de perforación
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
    shadowOffset: {
      width: scaleByContent(2, 'spacing'),
      height: scaleByContent(2, 'spacing'),
    },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Container centralizado que agrupa logo y texto circular
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 350,
    height: 350,
    marginTop: 20,
  },

  // Logo container
  logoContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  // Shot container - Valores más conservadores y visibles
  shotContainer: {
    width: 280,
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
  },

  shotLogo: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },

  // Wrapper para centrar el texto circular
  circularTextWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    marginTop: -10,
  },

  // Container para el texto circular - Más cerca del logo
  circularTextContainer: {
    position: 'relative',
  },
  
});

export default SplashScreen;