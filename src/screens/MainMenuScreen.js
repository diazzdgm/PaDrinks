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
import { Audio } from 'expo-av';
import audioService from '../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../styles/theme';
import { useSocket } from '../hooks/useSocket';
import { useSafeAreaOffsets } from '../hooks/useSafeAreaOffsets';
import { setSocketConnected } from '../store/connectionSlice';
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
} from '../utils/responsive';

// 🔊 ICONO PERSONALIZADO USANDO PNG - RESPONSIVE
const CustomMuteIcon = ({ size, isMuted = false }) => {
  const responsiveSize = size || scaleModerate(50, 0.3);
  
  return (
    <View style={styles.customIconContainer}>
      <Image 
        source={require('../../assets/images/Megaphone.MUTE.png')}
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

const MainMenuScreen = ({ navigation }) => {
  // Redux
  const dispatch = useDispatch();
  const { isConnected, isConnecting } = useSelector(state => state.connection);
  
  // Socket hooks
  const { connect, disconnect, connected } = useSocket();

  // Safe area offsets para iOS
  const { rightOffset, topOffset } = useSafeAreaOffsets();

  // Device info para debugging responsive
  const deviceInfo = getDeviceInfo();
  const deviceType = getDeviceType();
  
  // Referencias para animaciones
  const logoFloat = useRef(new Animated.Value(0)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const buttonsSlideIn = useRef(new Animated.Value(300)).current;
  const doodlesOpacity = useRef(new Animated.Value(0)).current;
  
  // Animaciones individuales de botones
  const createGameScale = useRef(new Animated.Value(0.8)).current;
  const joinGameScale = useRef(new Animated.Value(0.8)).current;
  
  // Animaciones para efectos gooey
  const createGameGlow = useRef(new Animated.Value(0)).current;
  const joinGameGlow = useRef(new Animated.Value(0)).current;
  
  // Partículas animadas para cada botón
  const createGameParticles = useRef(Array.from({ length: 8 }, () => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    rotate: new Animated.Value(0),
  }))).current;
  
  const joinGameParticles = useRef(Array.from({ length: 8 }, () => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    rotate: new Animated.Value(0),
  }))).current;
  
  // audioService gestiona los sonidos automáticamente
  
  // Estado para controlar el mute
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  
  // Animación para el botón de mute
  const muteButtonScale = useRef(new Animated.Value(1)).current;
  
  // Función para conectar al backend - usando useCallback para evitar re-creación
  const initializeBackendConnection = React.useCallback(async () => {
    // Solo intentar conectar si no está ya conectado o conectando
    if (!isConnected && !isConnecting) {
      try {
        console.log('🔌 Iniciando conexión al backend desde MainMenu...');
        await connect();
        console.log('✅ Conexión al backend establecida desde MainMenu');
      } catch (error) {
        console.error('❌ Error conectando al backend desde MainMenu:', error.message);
        // No bloquear la funcionalidad, permitir uso offline
      }
    }
  }, [isConnected, isConnecting, connect]);

  useFocusEffect(
    React.useCallback(() => {
      // Debug responsive design (solo una vez)
      console.log('📱 Device Info:', {
        type: deviceType,
        dimensions: `${deviceInfo.width}x${deviceInfo.height}`,
        scaleFactors: {
          width: deviceInfo.scaleFactorWidth.toFixed(2),
          height: deviceInfo.scaleFactorHeight.toFixed(2),
          min: deviceInfo.scaleFactorMin.toFixed(2)
        }
      });
      
      startEntranceAnimations();
      // Inicializar y reproducir música solo desde MainMenu
      audioService.preloadSoundEffects();
      audioService.initializeBackgroundMusic();
      
      // Sincronizar estado de mute cuando regresamos a la pantalla
      setIsMuted(audioService.isMusicMuted);
      
      // Conectar al backend automáticamente
      initializeBackendConnection();
      
      // audioService gestiona automáticamente la limpieza
      return () => {
        // No necesitamos limpieza manual
      };
    }, [])
  );

  // audioService gestiona automáticamente la limpieza de sonidos
  // No necesitamos cleanupSound manual



  const toggleMute = async () => {
    playWinePopSound();

    try {
      const newMuteState = await audioService.toggleMute();
      setIsMuted(newMuteState);

      // Animación del botón mute
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

  const playBeerSound = async () => {
    // audioService gestiona automáticamente la limpieza, no necesitamos guardar referencia
    await audioService.playSoundEffect('beer');
  };

  const playWinePopSound = async () => {
    await audioService.playSoundEffect('wine');
  };

  const startEntranceAnimations = () => {
    // Resetear valores
    logoFade.setValue(0);
    buttonsSlideIn.setValue(300);
    createGameScale.setValue(0.8);
    joinGameScale.setValue(0.8);
    doodlesOpacity.setValue(0);

    // Secuencia de animaciones staggered
    Animated.sequence([
      // 1. Logo aparece primero
      Animated.parallel([
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(doodlesOpacity, {
          toValue: 0.1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      // 2. Botones principales se deslizan desde la derecha
      Animated.parallel([
        Animated.timing(buttonsSlideIn, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.stagger(150, [
          Animated.spring(createGameScale, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(joinGameScale, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    // Iniciar animación continua del logo
    startLogoFloating();
  };

  const startLogoFloating = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const createGooeyEffect = (particles, glowAnim, colors) => {
    // Resetear partículas
    particles.forEach(particle => {
      particle.scale.setValue(0);
      particle.opacity.setValue(0);
      particle.translateX.setValue(0);
      particle.translateY.setValue(0);
      particle.rotate.setValue(0);
    });

    // Animar el glow del botón
    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animar partículas
    particles.forEach((particle, index) => {
      const delay = index * 50;
      const angle = (360 / particles.length) * index * (Math.PI / 180);
      const distance = 60 + Math.random() * 40;
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance;
      const rotateEnd = (Math.random() - 0.5) * 720;

      setTimeout(() => {
        Animated.parallel([
          // Movimiento de partícula
          Animated.timing(particle.translateX, {
            toValue: endX,
            duration: 800 + Math.random() * 400,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: endY,
            duration: 800 + Math.random() * 400,
            useNativeDriver: true,
          }),
          // Rotación
          Animated.timing(particle.rotate, {
            toValue: rotateEnd,
            duration: 1000 + Math.random() * 500,
            useNativeDriver: true,
          }),
          // Escala y opacidad
          Animated.sequence([
            Animated.timing(particle.scale, {
              toValue: 0.8 + Math.random() * 0.4,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.delay(300),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }, delay);
    });
  };

  const pressButton = (buttonScale, glowAnim, particles, callback) => {
    // Haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    // Reproducir sonido
    playBeerSound();

    // Crear efecto gooey
    createGooeyEffect(particles, glowAnim);

    // Nueva animación: Press + Ripple + Slight Rotation
    Animated.parallel([
      // Efecto press (hundir y expandir)
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.88, // Se hunde más
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1.02, // Ligera expansión
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (callback) callback();
    });
  };

  const handleCreateGame = () => {
    pressButton(createGameScale, createGameGlow, createGameParticles, () => {
      setTimeout(() => {
        navigation.navigate('CreateGame');
      }, 200);
    });
  };

  const handleJoinGame = () => {
    pressButton(joinGameScale, joinGameGlow, joinGameParticles, () => {
      setTimeout(() => {
        navigation.navigate('JoinGame');
      }, 200);
    });
  };

  // Función temporal para test de backend (eliminada)



  return (
    <View style={styles.container}>
      {/* Fondo de papel con líneas */}
      <View style={styles.paperBackground}>
        {/* Líneas horizontales de libreta */}
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
        
        {/* Agujeros de perforación (izquierda) */}
        <View style={styles.holesPunch}>
          {[...Array(8)].map((_, index) => (
            <View key={index} style={styles.hole} />
          ))}
        </View>
      </View>

      {/* Doodles decorativos */}
      <Animated.View 
        style={[
          styles.doodlesContainer,
          { opacity: doodlesOpacity }
        ]}
      >
        <Text style={[styles.doodle, { top: '15%', left: '25%' }]}>🎉</Text>
        <Text style={[styles.doodle, { top: '75%', left: '15%' }]}>🍺</Text>
        <Text style={[styles.doodle, { top: '45%', right: '15%' }]}>🎮</Text>
        <Text style={[styles.doodle, { bottom: '20%', right: '25%' }]}>🥳</Text>
        <Text style={[styles.doodle, { top: '25%', right: '35%' }]}>🎊</Text>
        <Text style={[styles.doodle, { bottom: '40%', left: '30%' }]}>🔥</Text>
      </Animated.View>

      <View style={styles.content}>
        
        {/* LADO IZQUIERDO - Logo y Branding */}
        <Animated.View 
          style={[
            styles.leftSide,
            {
              opacity: logoFade,
              transform: [
                {
                  translateY: logoFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Logo Container sin fondo */}
          <View style={styles.logoContainer}>
            {/* Logo de PADRINKS */}
            <View style={styles.logoImageContainer}>
              <Image 
                source={require('../../assets/images/PADRINKS.logo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            {/* Título principal */}
            <Text style={styles.appTitle}>PaDrinks</Text>
            
            {/* Versión */}
            <Text style={styles.appVersion}>v1.0</Text>
          </View>
        </Animated.View>

        {/* LADO DERECHO - Botones de navegación */}
        <Animated.View 
          style={[
            styles.rightSide,
            {
              transform: [{ translateX: buttonsSlideIn }],
            },
          ]}
        >
          
          {/* Botones principales */}
          <View style={styles.mainButtonsContainer}>
            
            {/* Botón Crear Partida */}
            <Animated.View style={{ transform: [{ scale: createGameScale }] }}>
              <View style={styles.buttonContainer}>
                {/* Efecto glow */}
                <Animated.View 
                  style={[
                    styles.buttonGlow,
                    styles.createGameGlow,
                    {
                      opacity: createGameGlow,
                      transform: [
                        { 
                          scale: createGameGlow.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.2],
                          })
                        }
                      ],
                    }
                  ]} 
                />
                
                {/* Partículas */}
                {createGameParticles.map((particle, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.particle,
                      styles.createGameParticle,
                      {
                        opacity: particle.opacity,
                        transform: [
                          { translateX: particle.translateX },
                          { translateY: particle.translateY },
                          { scale: particle.scale },
                          { 
                            rotate: particle.rotate.interpolate({
                              inputRange: [0, 360],
                              outputRange: ['0deg', '360deg'],
                            })
                          },
                        ],
                      },
                    ]}
                  />
                ))}
                
                <TouchableOpacity
                  style={[styles.mainButton, styles.createGameButton]}
                  onPress={handleCreateGame}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonIcon}>🎯</Text>
                  <Text style={[styles.buttonText, styles.createGameText]}>
                    CREAR PARTIDA
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Botón Unirse a Partida */}
            <Animated.View style={{ transform: [{ scale: joinGameScale }] }}>
              <View style={styles.buttonContainer}>
                {/* Efecto glow */}
                <Animated.View 
                  style={[
                    styles.buttonGlow,
                    styles.joinGameGlow,
                    {
                      opacity: joinGameGlow,
                      transform: [
                        { 
                          scale: joinGameGlow.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.2],
                          })
                        }
                      ],
                    }
                  ]} 
                />
                
                {/* Partículas */}
                {joinGameParticles.map((particle, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.particle,
                      styles.joinGameParticle,
                      {
                        opacity: particle.opacity,
                        transform: [
                          { translateX: particle.translateX },
                          { translateY: particle.translateY },
                          { scale: particle.scale },
                          { 
                            rotate: particle.rotate.interpolate({
                              inputRange: [0, 360],
                              outputRange: ['0deg', '360deg'],
                            })
                          },
                        ],
                      },
                    ]}
                  />
                ))}
                
                <TouchableOpacity
                  style={[styles.mainButton, styles.joinGameButton]}
                  onPress={handleJoinGame}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonIcon}>🚀</Text>
                  <Text style={[styles.buttonText, styles.joinGameText]}>
                    UNIRSE A PARTIDA
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>


          </View>


        </Animated.View>

      </View>

      {/* Botón de Mute estilo sketch con SVG */}
      <Animated.View
        style={[
          styles.sketchMuteButton,
          {
            right: rightOffset,
            top: topOffset + scaleHeight(isSmallDevice() ? 10 : isTablet() ? 15 : 12),
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

      {/* Indicador de conexión */}
      <View style={[
        styles.connectionIndicator,
        {
          top: topOffset + scaleHeight(isSmallDevice() ? 10 : isTablet() ? 15 : 12) + scaleModerate(isSmallDevice() ? 55 : isTablet() ? 60 : 70, 0.3) + scaleByContent(8, 'spacing'),
          right: rightOffset,
        },
      ]}>
        <View style={[
          styles.connectionDot,
          { backgroundColor: connected ? '#4CAF50' : isConnecting ? '#FF9800' : '#F44336' }
        ]} />
        <Text style={styles.connectionText}>
          {connected ? 'Online' : isConnecting ? 'Conectando...' : 'Offline'}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          PaDrinks • Bebe responsablemente • No conduzcas
        </Text>
        
      </View>

    </View>
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
    backgroundColor: '#F8F6F0', // Paper cream
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
  
  // Doodles decorativos
  doodlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  doodle: {
    position: 'absolute',
    fontSize: scaleByContent(24, 'text'),
    opacity: 0.15,
  },
  
  content: {
    flex: 1,
    flexDirection: 'row', // Layout horizontal
    paddingHorizontal: scaleWidth(isSmallDevice() ? 20 : isTablet() ? 30 : 40),
    paddingVertical: scaleHeight(isSmallDevice() ? 15 : isTablet() ? 20 : 30),
  },
  
  // LADO IZQUIERDO - Logo
  leftSide: {
    flex: isSmallDevice() ? 0.35 : isTablet() ? 0.4 : 0.4, // Menos espacio en pantallas pequeñas
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: scaleWidth(isSmallDevice() ? 10 : 20),
    paddingLeft: scaleWidth(isSmallDevice() ? 30 : isTablet() ? 40 : 60),
  },
  
  logoContainer: {
    alignItems: 'center',
  },
  
  logoImageContainer: {
    marginBottom: scaleHeight(-10),
  },
  
  logoImage: {
    width: isSmallDevice() ? scale(160) : isTablet() ? scale(130) : scale(220),
    height: isSmallDevice() ? scale(160) : isTablet() ? scale(130) : scale(220),
  },
  
  appTitle: {
    fontSize: isSmallDevice() ? scaleText(36) : isTablet() ? scaleText(40) : scaleText(48),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleHeight(-5),
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: scale(1), height: scale(1) },
    textShadowRadius: scale(2),
  },
  
  appSubtitle: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: scaleByContent(10, 'spacing'),
  },
  
  appVersion: {
    fontSize: isSmallDevice() ? scaleText(10) : isTablet() ? scaleText(10) : scaleText(12),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginTop: scaleHeight(isSmallDevice() ? -5 : isTablet() ? -3 : -4), // Más cerca del logo
  },
  
  // LADO DERECHO - Botones
  rightSide: {
    flex: isSmallDevice() ? 0.65 : isTablet() ? 0.6 : 0.6, // Más espacio en pantallas pequeñas
    justifyContent: 'center',
    paddingLeft: scaleWidth(isSmallDevice() ? 10 : isTablet() ? 30 : 20),
  },
  
  mainButtonsContainer: {
    gap: scaleHeight(isSmallDevice() ? 12 : isTablet() ? 10 : 16),
  },
  
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(isSmallDevice() ? 8 : isTablet() ? 9 : 12),
    paddingHorizontal: scaleWidth(isSmallDevice() ? 12 : isTablet() ? 16 : 18),
    borderRadius: scale(isSmallDevice() ? 12 : isTablet() ? 10 : 15),
    borderTopLeftRadius: scale(5),
    shadowColor: '#000',
    shadowOffset: {
      width: scale(3),
      height: scale(3),
    },
    shadowOpacity: 0.25,
    shadowRadius: scale(6),
    elevation: 6,
    borderWidth: scaleBorder(2),
  },
  
  createGameButton: {
    backgroundColor: '#FFE082', // Post-it amarillo
    borderColor: '#000000', // Negro
    transform: [{ rotate: '0deg' }],
  },
  
  joinGameButton: {
    backgroundColor: '#C8E6C9', // Post-it verde
    borderColor: '#000000', // Negro
    transform: [{ rotate: '0deg' }],
  },
  
  
  buttonIcon: {
    fontSize: isSmallDevice() ? scaleText(20) : isTablet() ? scaleText(20) : scaleText(24),
    marginRight: scaleWidth(isSmallDevice() ? 8 : isTablet() ? 16 : 12),
  },
  
  buttonText: {
    fontSize: isSmallDevice() ? scaleText(16) : isTablet() ? scaleText(18) : scaleText(20),
    fontFamily: theme.fonts.primaryBold,
    flex: 1,
  },
  
  createGameText: {
    color: '#2E2E2E', // Negro
  },
  
  joinGameText: {
    color: '#2E2E2E', // Negro
  },
  
  // Contenedor de efectos
  buttonContainer: {
    position: 'relative',
  },
  
  // Efectos glow
  buttonGlow: {
    position: 'absolute',
    top: scaleByContent(-10, 'spacing'),
    left: scaleByContent(-10, 'spacing'),
    right: scaleByContent(-10, 'spacing'),
    bottom: scaleByContent(-10, 'spacing'),
    borderRadius: scaleBorder(25),
    zIndex: -1,
  },
  
  createGameGlow: {
    backgroundColor: '#FFE082',
    shadowColor: '#FFD54F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  
  joinGameGlow: {
    backgroundColor: '#C8E6C9',
    shadowColor: '#A5D6A7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Partículas
  particle: {
    position: 'absolute',
    width: scaleByContent(12, 'icon'),
    height: scaleByContent(12, 'icon'),
    borderRadius: scaleBorder(6),
    top: '50%',
    left: '50%',
    marginTop: scaleByContent(-6, 'spacing'),
    marginLeft: scaleByContent(-6, 'spacing'),
    zIndex: 2,
  },
  
  createGameParticle: {
    backgroundColor: '#FF7F11', // Orange del juego
    shadowColor: '#FF7F11',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  
  joinGameParticle: {
    backgroundColor: '#A8E10C', // Lime green del juego
    shadowColor: '#A8E10C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Indicador de conexión
  connectionIndicator: {
    position: 'absolute',
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
    width: scale(isSmallDevice() ? 6 : isTablet() ? 10 : 8),
    height: scale(isSmallDevice() ? 6 : isTablet() ? 10 : 8),
    borderRadius: scale(isSmallDevice() ? 3 : isTablet() ? 5 : 4),
    marginRight: scaleWidth(6),
  },
  
  connectionText: {
    fontSize: isSmallDevice() ? scaleText(10) : isTablet() ? scaleText(12) : scaleText(12),
    fontFamily: theme.fonts.primary,
    color: '#333',
  },

  // Botón de Mute estilo sketch
  sketchMuteButton: {
    position: 'absolute',
    top: scaleHeight(isSmallDevice() ? 10 : isTablet() ? 15 : 12),
    right: scaleWidth(isSmallDevice() ? 15 : isTablet() ? 25 : 20),
    width: scaleModerate(isSmallDevice() ? 55 : isTablet() ? 60 : 70, 0.3),
    height: scaleModerate(isSmallDevice() ? 55 : isTablet() ? 60 : 70, 0.3),
    borderRadius: scaleModerate(isSmallDevice() ? 27.5 : isTablet() ? 30 : 35, 0.3),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { 
      width: scale(3), 
      height: scale(3) 
    },
    shadowOpacity: 0.25,
    shadowRadius: scale(6),
    elevation: 6,
    transform: [{ rotate: '0deg' }],
    zIndex: 10,
  },
  
  // TouchableOpacity interno
  muteButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  
  // Estilos para íconos nativos de volumen
  nativeVolumeIcon: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Base del altavoz
  speakerBase: {
    position: 'absolute',
    left: 2,
    top: 8,
    width: 6,
    height: 8,
    borderRadius: 1,
    transform: [{ rotate: '0deg' }],
  },
  
  // Cono del altavoz
  speakerCone: {
    position: 'absolute',
    left: 7,
    top: 5,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '0deg' }],
  },
  
  // Contenedor de ondas de sonido
  soundWaves: {
    position: 'absolute',
    right: 0,
    top: 4,
  },
  
  // Primera onda de sonido
  soundWave1: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 2,
    backgroundColor: 'transparent',
    top: 3,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    transform: [{ rotate: '5deg' }],
  },
  
  // Segunda onda de sonido
  soundWave2: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: 'transparent',
    top: 1,
    right: 2,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    transform: [{ rotate: '0deg' }],
  },
  
  // Contenedor de X para muted
  muteX: {
    position: 'absolute',
    right: -1,
    top: 4,
    width: 14,
    height: 14,
  },
  
  // Línea 1 de la X
  xLine1: {
    position: 'absolute',
    width: 16,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    top: 5,
    left: -1,
  },
  
  // Línea 2 de la X
  xLine2: {
    position: 'absolute',
    width: 16,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
    top: 5,
    left: -1,
  },
  
  // Estilos para CustomMuteIcon
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
  
  // Footer - Posicionado en la parte inferior con margen
  footer: {
    position: 'absolute',
    bottom: scaleHeight(isSmallDevice() ? 15 : isTablet() ? 25 : 20), // Margen desde el borde inferior
    left: scaleWidth(isSmallDevice() ? 20 : isTablet() ? 40 : 30),
    right: scaleWidth(isSmallDevice() ? 20 : isTablet() ? 40 : 30),
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: isSmallDevice() ? scaleText(9, 8, 11) : isTablet() ? scaleText(10, 8, 12) : scaleText(11, 9, 13),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    opacity: 0.8, // Ligeramente más visible
  },
  
  // Estilos del botón de test eliminados
});

export default MainMenuScreen;