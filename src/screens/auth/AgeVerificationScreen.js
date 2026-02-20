import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  BackHandler,
  Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';
import audioService from '../../services/AudioService';
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

const AgeVerificationScreen = ({ navigation }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showUnderageModal, setShowUnderageModal] = useState(false);
  
  // Animaciones principales
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  
  // Nuevas animaciones dramáticas
  const iconFall = useRef(new Animated.Value(-200)).current;
  const questionSlide = useRef(new Animated.Value(-100)).current;
  const infoFloat = useRef(new Animated.Value(0)).current;
  const iconBlink = useRef(new Animated.Value(1)).current;
  
  // Animaciones de botones
  const yesButtonScale = useRef(new Animated.Value(1)).current;
  const noButtonScale = useRef(new Animated.Value(1)).current;
  
  // Animaciones del modal personalizado
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  
  // Referencias para el sonido
  const beerSound = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      // Iniciar animaciones
      startAnimations();

      return () => {
        // Limpiar sonido al salir
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
      { volume: 0.7 }
    );
    
    if (soundObject) {
      beerSound.current = soundObject;
      console.log('🍺 Reproduciendo sonido de lata de cerveza...');
    }
  };

  const startAnimations = () => {
    // Animación dramática de entrada - Más rápida
    Animated.sequence([
      // 1. Icono cae desde arriba (más rápido)
      Animated.spring(iconFall, {
        toValue: 0,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      
      // 2. Pregunta y botones aparecen simultáneamente
      Animated.parallel([
        Animated.timing(questionSlide, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Micro-animaciones continuas
    startMicroAnimations();
  };
  
  const startMicroAnimations = () => {
    // Pulso suave del icono
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Parpadeo ocasional del icono (menos frecuente)
    const startBlinking = () => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(iconBlink, {
            toValue: 0.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(iconBlink, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Repetir parpadeo menos frecuentemente
          setTimeout(startBlinking, Math.random() * 8000 + 5000);
        });
      }, Math.random() * 5000 + 3000);
    };
    startBlinking();
    
    // Flotación sutil del post-it de información
    Animated.loop(
      Animated.sequence([
        Animated.timing(infoFloat, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(infoFloat, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Efecto bounce para botones
  const bounceButton = (buttonScale) => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleYesPress = () => {
    // Haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    setSelectedAnswer('yes');
    
    // Reproducir sonido de lata de cerveza
    playBeerSound();
    
    // Efecto bounce en el botón
    bounceButton(yesButtonScale);

    // Animar transición de salida antes de navegar
    setTimeout(() => {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace('MainMenu');
      });
    }, 600);
  };

  const handleNoPress = () => {
    // Haptic feedback más fuerte para "No"
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    setSelectedAnswer('no');
    
    // Efecto bounce en el botón
    bounceButton(noButtonScale);
    
    // Mostrar modal personalizado
    setShowUnderageModal(true);

    // Animar entrada del modal - Solo opacidad para iOS
    modalOpacity.setValue(0);
    Animated.timing(modalOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Fondo de papel con líneas */}
      <View style={styles.paperBackground}>
        {/* Líneas de libreta horizontales */}
        <View style={styles.notebookLines}>
          {[...Array(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 50 : Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) < 700 ? 20 : 25)].map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.line, 
                { top: scaleByContent(60, 'spacing') + (index * scaleByContent(25, 'spacing')) }
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
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        
        {/* SECCIÓN SUPERIOR - Icono y Pregunta */}
        <View style={styles.topSection}>
          {/* Icono principal con animaciones dramáticas */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { translateY: iconFall },
                  { scale: iconPulse }
                ],
                opacity: iconBlink,
              },
            ]}
          >
            <Text style={styles.mainIcon}>🔞</Text>
          </Animated.View>

          {/* Pregunta principal con deslizamiento */}
          <Animated.View 
            style={[
              styles.questionContainer,
              {
                transform: [{ translateX: questionSlide }],
              },
            ]}
          >
            <Text style={styles.question}>
              ¿Eres mayor de 18 años?
            </Text>
          </Animated.View>
        </View>

        {/* SECCIÓN CENTRAL - Botones */}
        <View style={styles.centerSection}>
          {/* Botones de respuesta */}
          <Animated.View
            style={[
              styles.buttonsContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
          
          {/* Botón SÍ con efecto bounce */}
          <Animated.View style={{ transform: [{ scale: yesButtonScale }] }}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.yesButton,
                selectedAnswer === 'yes' && styles.selectedButton,
              ]}
              onPress={handleYesPress}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.yesButtonText]}>
                ✅ Sí, soy mayor de 18
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Botón NO con efecto bounce */}
          <Animated.View style={{ transform: [{ scale: noButtonScale }] }}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.noButton,
                selectedAnswer === 'no' && styles.selectedButton,
              ]}
              onPress={handleNoPress}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.noButtonText]}>
                ❌ No, soy menor de 18
              </Text>
            </TouchableOpacity>
          </Animated.View>

          </Animated.View>
        </View>

        {/* SECCIÓN INFERIOR - Información (eliminada) */}

      </Animated.View>

      {/* Footer con advertencia */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🚨 Bebe responsablemente • No conduzcas bajo la influencia del alcohol
        </Text>
      </View>

      {/* Modal personalizado para menores de edad */}
      {showUnderageModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
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
                  style={[
                    styles.modalLine, 
                    { top: scaleByContent(30, 'spacing') + (index * scaleByContent(20, 'spacing')) }
                  ]} 
                />
              ))}
              
              {/* Línea vertical roja */}
              <View style={styles.modalRedLine} />
              
              {/* Agujeros de perforación del modal */}
              <View style={styles.modalHoles}>
                {[...Array(6)].map((_, index) => (
                  <View key={index} style={styles.modalHole} />
                ))}
              </View>
            </View>
            
            {/* Contenido del modal */}
            <View style={styles.modalContent}>
              <Text style={styles.modalIcon}>🔞</Text>
              
              <Text style={styles.modalTitle}>Lo sentimos</Text>
              
              <Text style={styles.modalMessage}>
                Debes ser mayor de 18 años{"\n"}para usar PaDrinks.
              </Text>
              
              <Text style={styles.modalSubMessage}>
                Regresa cuando cumplas{"\n"}la mayoría de edad.
              </Text>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  // Animar salida y cerrar app
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
                    BackHandler.exitApp();
                  });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
        </View>
      )}

    </View>
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
    backgroundColor: theme.colors.background,
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
    borderRadius: scaleByContent(10, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(2, 'spacing'),
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
    flexDirection: 'column',
    justifyContent: 'center', // Centrar verticalmente
    alignItems: 'center', // Centrar horizontalmente
    paddingHorizontal: 40, // Padding simétrico para centrar correctamente
    paddingBottom: scaleByContent(60, 'spacing'), // Mantener espacio para el footer
  },
  
  
  // SECCIÓN SUPERIOR - Icono y pregunta
  topSection: {
    alignItems: 'center',
    marginBottom: scaleByContent(20, 'spacing'),
  },
  
  // Icono principal
  iconContainer: {
    marginBottom: scaleByContent(15, 'spacing'),
  },
  
  mainIcon: {
    fontSize: scaleByContent(60, 'icon'),
    textAlign: 'center',
  },
  
  // Pregunta
  questionContainer: {
    alignItems: 'center',
  },
  
  question: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    transform: [{ rotate: '0.5deg' }],
    lineHeight: Platform.OS === 'ios' ? scaleByContent(32, 'text') : scaleByContent(28, 'text'),
    includeFontPadding: false,
    paddingTop: Platform.OS === 'ios' ? 5 : 0,
  },
  
  // SECCIÓN CENTRAL - Botones
  centerSection: {
    width: '100%',
    alignItems: 'center',
  },
  
  // Botones
  buttonsContainer: {
    width: isSmallScreen ? '60%' : isTabletScreen ? '50%' : '55%', // Responsivo: más ancho en pantallas pequeñas
    gap: scaleHeight(isSmallScreen ? 5 : isTabletScreen ? 8 : 6), // Gap responsivo
    marginTop: scaleHeight(isSmallScreen ? 3 : isTabletScreen ? 6 : 4), // Reducido para subir más los botones
    marginBottom: scaleHeight(isSmallScreen ? 6 : isTabletScreen ? 10 : 8), // Espaciado responsivo
  },
  
  button: {
    width: '100%', // Ancho completo
    paddingVertical: scaleHeight(isSmallScreen ? 6 : isTabletScreen ? 8 : 7), // Más chaparros
    paddingHorizontal: scaleWidth(isSmallScreen ? 20 : isTabletScreen ? 30 : 25),
    borderRadius: scale(theme.borderRadius.large),
    borderTopLeftRadius: scale(theme.borderRadius.small),
    shadowColor: '#000',
    shadowOffset: {
      width: scale(3),
      height: scale(3),
    },
    shadowOpacity: 0.25,
    shadowRadius: scale(6),
    elevation: 6,
    marginVertical: scaleHeight(2), // Margen vertical mínimo
  },
  
  yesButton: {
    backgroundColor: theme.colors.postItGreen,
    borderWidth: 3,
    borderColor: theme.colors.success,
    transform: [{ rotate: '-1deg' }],
  },
  
  noButton: {
    backgroundColor: theme.colors.postItPink,
    borderWidth: 3,
    borderColor: theme.colors.error,
    transform: [{ rotate: '1deg' }],
  },
  
  selectedButton: {
    transform: [{ scale: 0.95 }],
  },
  
  buttonText: {
    fontSize: isSmallScreen ? scaleText(14) : isTabletScreen ? scaleText(20) : scaleText(16),
    fontFamily: theme.fonts.primaryBold,
    textAlign: 'center',
  },
  
  yesButtonText: {
    color: theme.colors.success,
  },
  
  noButtonText: {
    color: theme.colors.error,
  },
  
  // SECCIÓN INFERIOR - Información (eliminada)
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: scaleByContent(15, 'spacing'),
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  footerText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: theme.colors.error,
    textAlign: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    paddingHorizontal: scaleByContent(16, 'spacing'),
    paddingVertical: scaleByContent(2, 'spacing'),
    borderRadius: scaleByContent(8, 'spacing'),
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderStyle: 'dashed',
  },
  
  // Estilos del modal personalizado
  absoluteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(50, 'spacing'),
  },
  
  modalContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: scaleByContent(25, 'spacing'),
    padding: scaleByContent(20, 'spacing'),
    maxWidth: scaleByContent(500, 'interactive'), // Igual que CreateGameScreen
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
    borderRadius: scaleByContent(22, 'spacing'), // Ligeramente menor que el container
    backgroundColor: '#F8F6F0', // Asegurar fondo sólido
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
    paddingLeft: scaleByContent(50, 'spacing'), // Valores fijos como CreateGameScreen
    paddingRight: scaleByContent(15, 'spacing'),
    paddingTop: scaleByContent(20, 'spacing'),
    paddingBottom: scaleByContent(10, 'spacing'),
    flex: 1,
    minHeight: scaleByContent(250, 'spacing'),
  },
  
  modalIcon: {
    fontSize: scaleByContent(60, 'icon'), // Tamaño fijo apropiado para el modal más ancho
    marginBottom: scaleByContent(15, 'spacing'),
  },
  
  modalTitle: {
    fontSize: scaleByContent(24, 'text'), // Tamaño fijo como CreateGameScreen
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
    transform: [{ rotate: '0.5deg' }],
  },
  
  modalMessage: {
    fontSize: scaleByContent(16, 'text'), // Tamaño estándar para el modal más ancho
    fontFamily: theme.fonts.primary,
    color: '#333333',
    textAlign: 'center',
    marginBottom: scaleByContent(10, 'spacing'),
    lineHeight: scaleByContent(22, 'text'),
  },
  
  modalSubMessage: {
    fontSize: scaleByContent(14, 'text'), // Tamaño fijo
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginBottom: scaleByContent(25, 'spacing'),
    fontStyle: 'italic',
    lineHeight: scaleByContent(18, 'text'),
  },
  
  modalButton: {
    backgroundColor: '#FFE082',
    paddingHorizontal: scaleByContent(30, 'interactive'), // Valores fijos apropiados
    paddingVertical: scaleByContent(12, 'interactive'),
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
    fontSize: scaleByContent(16, 'text'), // Tamaño fijo apropiado
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
});

export default AgeVerificationScreen;