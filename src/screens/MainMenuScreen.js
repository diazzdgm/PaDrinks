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
import audioService from '../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../styles/theme';
import { useSocket } from '../hooks/useSocket';
import { setSocketConnected } from '../store/connectionSlice';

// 🔊 ICONO PERSONALIZADO USANDO PNG
const CustomMuteIcon = ({ size = 50, isMuted = false }) => {
  return (
    <View style={styles.customIconContainer}>
      <Image 
        source={require('../../assets/images/Megaphone.MUTE.png')}
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

const MainMenuScreen = ({ navigation }) => {
  // Redux
  const dispatch = useDispatch();
  const { isConnected, isConnecting } = useSelector(state => state.connection);
  
  // Socket hooks
  const { connect, disconnect, connected } = useSocket();
  
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
  
  // Función para conectar al backend
  const initializeBackendConnection = async () => {
    if (!connected && !isConnecting) {
      try {
        console.log('🔌 Iniciando conexión al backend desde MainMenu...');
        await connect();
        dispatch(setSocketConnected({ connected: true, socketId: connected }));
        console.log('✅ Conexión al backend establecida desde MainMenu');
      } catch (error) {
        console.error('❌ Error conectando al backend desde MainMenu:', error.message);
        // No bloquear la funcionalidad, permitir uso offline
        dispatch(setSocketConnected({ connected: false, socketId: null }));
      }
    } else if (connected) {
      console.log('🔌 Ya conectado al backend desde MainMenu');
      dispatch(setSocketConnected({ connected: true, socketId: connected }));
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      startEntranceAnimations();
      // Inicializar y reproducir música solo desde MainMenu
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
    await audioService.playSoundEffect(
      require('../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );
    console.log('🍺 Reproduciendo sonido de lata de cerveza...');
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

  // Función temporal para test de backend
  const handleBackendTest = () => {
    Alert.alert(
      '🧪 Test Backend',
      '¿Quieres probar la conexión con el backend?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Test', 
          onPress: () => navigation.navigate('BackendTest')
        }
      ]
    );
  };



  return (
    <View style={styles.container}>
      {/* Fondo de papel con líneas */}
      <View style={styles.paperBackground}>
        {/* Líneas horizontales de libreta */}
        <View style={styles.notebookLines}>
          {[...Array(20)].map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.line, 
                { top: 40 + (index * 25) }
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

      {/* Indicador de conexión */}
      <View style={styles.connectionIndicator}>
        <View style={[
          styles.connectionDot,
          { backgroundColor: connected ? '#4CAF50' : isConnecting ? '#FF9800' : '#F44336' }
        ]} />
        <Text style={styles.connectionText}>
          {connected ? 'Online' : isConnecting ? 'Conectando...' : 'Offline'}
        </Text>
      </View>

      {/* Botón de Mute estilo sketch con SVG */}
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

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          PaDrinks • Bebe responsablemente • No conduzcas
        </Text>
        
        {/* Botón de test temporal - desarrollo */}
        <TouchableOpacity 
          style={styles.testButton}
          onPress={handleBackendTest}
          activeOpacity={0.7}
        >
          <Text style={styles.testButtonText}>🧪 Test Backend</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

const { width, height } = Dimensions.get('window');

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
    left: 100, // Después de agujeros y margen
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
  
  // Línea roja del margen
  redMarginLine: {
    position: 'absolute',
    left: 95,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.5,
  },
  
  // Agujeros de perforación
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
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    fontSize: 24,
    opacity: 0.15,
  },
  
  content: {
    flex: 1,
    flexDirection: 'row', // Layout horizontal
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  
  // LADO IZQUIERDO - Logo
  leftSide: {
    flex: 0.4, // 40% del ancho
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 20,
    paddingLeft: 60, // Mover contenido más a la derecha
  },
  
  logoContainer: {
    alignItems: 'center',
  },
  
  logoImageContainer: {
    marginBottom: -10, // Negativo para superponer los textos más al logo
  },
  
  logoImage: {
    width: 220,
    height: 220,
  },
  
  appTitle: {
    fontSize: 48, // Aumentado de 36 a 48
    fontFamily: theme.fonts.primaryBold,
    color: '#000000', // Negro
    textAlign: 'center',
    marginBottom: -5, // Negativo para acercar más a la versión
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  appSubtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: '#2E2E2E',
    textAlign: 'center',
    marginBottom: 10,
  },
  
  appVersion: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginTop: -15, // Subir mucho más el texto
  },
  
  // LADO DERECHO - Botones
  rightSide: {
    flex: 0.6, // 60% del ancho
    justifyContent: 'center',
    paddingLeft: 20,
  },
  
  mainButtonsContainer: {
    gap: 20,
  },
  
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 18,
    borderTopLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
  },
  
  createGameButton: {
    backgroundColor: '#FFE082', // Post-it amarillo
    borderColor: '#000000', // Negro
    transform: [{ rotate: '-0.8deg' }],
  },
  
  joinGameButton: {
    backgroundColor: '#C8E6C9', // Post-it verde
    borderColor: '#000000', // Negro
    transform: [{ rotate: '0.6deg' }],
  },
  
  
  buttonIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  
  buttonText: {
    fontSize: 20,
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
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 25,
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
    width: 12,
    height: 12,
    borderRadius: 6,
    top: '50%',
    left: '50%',
    marginTop: -6,
    marginLeft: -6,
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
    top: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    zIndex: 1000,
  },
  
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  
  connectionText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: '#333',
  },

  // Botón de Mute estilo sketch
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
    shadowOffset: { 
      width: 3, 
      height: 3 
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '1.5deg' }],
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
    transform: [{ rotate: '1deg' }],
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
    transform: [{ rotate: '-1deg' }],
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
    transform: [{ rotate: '3deg' }],
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
    transform: [{ rotate: '-1.5deg' }], // Counter-rotate
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
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 40, // Mover más arriba
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: 11,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    opacity: 0.7,
  },
  
  testButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginTop: 10,
    alignSelf: 'center',
  },
  
  testButtonText: {
    fontSize: 10,
    fontFamily: theme.fonts.primary,
    color: '#1976D2',
    textAlign: 'center',
  },
});

export default MainMenuScreen;