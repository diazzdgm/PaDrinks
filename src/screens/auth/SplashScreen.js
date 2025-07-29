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

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  // Animaciones
  const logoTranslateY = useRef(new Animated.Value(-height)).current; // Empieza arriba
  const logoScale = useRef(new Animated.Value(0)).current;
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
      // Configurar audio para reproducir incluso en modo silencioso
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Cargar el sonido
      const { sound: soundObject } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/pouring.shot.mp3'),
        {
          shouldPlay: false, // No reproducir automáticamente
          isLooping: false,
          volume: 0.8,
        }
      );
      
      sound.current = soundObject;
      
      // Reproducir desde el segundo 4 (4000ms)
      await soundObject.setPositionAsync(4000);
      await soundObject.playAsync();
      
      console.log('🔊 Reproduciendo sonido desde el segundo 4...');
      
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
        Animated.spring(logoTranslateY, {
          toValue: 0,
          tension: 20,  // Más bounce
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 20,
          friction: 3,
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
          {[...Array(20)].map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.line, 
                { top: 60 + (index * 25) }
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
        
        {/* Texto circular girando alrededor del logo - Texto más grande */}
        <CircularText 
          text="PADRINKS*PADRINKS*PADRINKS*"
          spinDuration={20000}
          radius={150}
          fontSize={30}
          style={styles.circularTextContainer}
          enableDancing={true}
        />

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
    left: 80, // Después de perforaciones y margen
    right: 20,
    bottom: 0,
  },
  
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E3F2FD',
    opacity: 0.6,
  },
  
  // Línea roja del margen
  redMarginLine: {
    position: 'absolute',
    left: 75,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },
  
  // Agujeros de perforación
  holesPunch: {
    position: 'absolute',
    left: 25,
    top: 60,
    bottom: 60,
    width: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  hole: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  
  // Logo container
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  
  // Shot container - Más grande
  shotContainer: {
    position: 'relative',
    width: 320,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  shotLogo: {
    width: 320,
    height: 400,
    zIndex: 1,
  },
  
  // Container para el texto circular - Perfectamente centrado
  circularTextContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -150,
    marginLeft: -150,
    zIndex: 1,
  },
  
});

export default SplashScreen;