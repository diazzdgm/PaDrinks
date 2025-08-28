import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  BackHandler,
  Dimensions,
  Modal,
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
  getDeviceType,
  isSmallDevice,
  isTablet,
  RESPONSIVE,
  getDeviceInfo 
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
      // Bloquear botón de retroceso en Android
      const onBackPress = () => {
        return true; // Prevenir ir hacia atrás
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      // Iniciar animaciones
      startAnimations();

      return () => {
        backHandler.remove();
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
    
    // Animar entrada del modal
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {/* Fondo de papel con líneas */}
      <View style={styles.paperBackground}>
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
      <Modal
        visible={showUnderageModal}
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
                  style={[
                    styles.modalLine, 
                    { top: 30 + (index * 20) }
                  ]} 
                />
              ))}
              
              {/* Línea vertical roja */}
              <View style={styles.modalRedLine} />
            </View>
            
            {/* Contenido del modal */}
            <View style={styles.modalContent}>
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
      </Modal>

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
  
  content: {
    flex: 1,
    flexDirection: 'column', // Layout vertical
    justifyContent: 'flex-start', // Empezar desde arriba
    alignItems: 'center', // Centrar horizontalmente
    paddingHorizontal: scaleWidth(isSmallScreen ? 40 : isTabletScreen ? 80 : 60),
    paddingTop: scaleHeight(isSmallScreen ? 8 : isTabletScreen ? 12 : 10), // Reducido aún más para subir todo
    paddingLeft: scaleWidth(130), // Espacio para el margen de la libreta
    paddingBottom: scaleHeight(60), // Mantener espacio para el footer
  },
  
  
  // SECCIÓN SUPERIOR - Icono y pregunta
  topSection: {
    alignItems: 'center',
    marginTop: scaleHeight(isSmallScreen ? 2 : isTabletScreen ? 5 : 3), // Reducido aún más para subir
    marginBottom: scaleHeight(isSmallScreen ? 4 : isTabletScreen ? 6 : 5), // Reducido más
  },
  
  // Icono principal
  iconContainer: {
    marginBottom: scaleHeight(isSmallScreen ? 2 : isTabletScreen ? 4 : 3), // Añadir responsividad
  },
  
  mainIcon: {
    fontSize: isSmallScreen ? scaleText(50) : isTabletScreen ? scaleText(70) : scaleText(60),
    textAlign: 'center',
  },
  
  // Pregunta
  questionContainer: {
    alignItems: 'center',
  },
  
  question: {
    fontSize: isSmallScreen ? scaleText(20) : isTabletScreen ? scaleText(28) : scaleText(24),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    transform: [{ rotate: '0.5deg' }],
    lineHeight: isSmallScreen ? scaleHeight(24) : isTabletScreen ? scaleHeight(32) : scaleHeight(28),
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
    bottom: scaleHeight(15),
    left: scaleWidth(120), // Alineado con el contenido (después del margen de libreta)
    right: scaleWidth(theme.spacing.sm),
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: isSmallScreen ? scaleText(10) : isTabletScreen ? scaleText(16) : scaleText(12),
    fontFamily: theme.fonts.primary,
    color: theme.colors.error,
    textAlign: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    paddingHorizontal: scaleWidth(theme.spacing.sm),
    paddingVertical: scale(2),
    borderRadius: scale(theme.borderRadius.small),
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderStyle: 'dashed',
  },
  
  // Estilos del modal personalizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  
  modalContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: scale(25),
    padding: scaleWidth(isSmallScreen ? 25 : isTabletScreen ? 40 : theme.spacing.xl),
    maxWidth: isSmallScreen ? scaleWidth(340) : isTabletScreen ? scaleWidth(500) : scaleWidth(400),
    width: '90%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: scale(10),
    },
    shadowOpacity: 0.3,
    shadowRadius: scale(20),
    elevation: 15,
  },
  
  modalPaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  },
  
  modalLine: {
    position: 'absolute',
    left: 40,
    right: 15,
    height: 1,
    backgroundColor: '#E3F2FD',
    opacity: 0.4,
  },
  
  modalRedLine: {
    position: 'absolute',
    left: 35,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.3,
  },
  
  modalContent: {
    alignItems: 'center',
    paddingLeft: 20,
  },
  
  modalTitle: {
    fontSize: isSmallScreen ? scaleText(24) : isTabletScreen ? scaleText(36) : scaleText(28),
    fontFamily: theme.fonts.primaryBold,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: scaleHeight(theme.spacing.lg),
    transform: [{ rotate: '-1deg' }],
  },
  
  modalMessage: {
    fontSize: isSmallScreen ? scaleText(16) : isTabletScreen ? scaleText(24) : scaleText(18),
    fontFamily: theme.fonts.primary,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: scaleHeight(theme.spacing.md),
    lineHeight: isSmallScreen ? scaleHeight(20) : isTabletScreen ? scaleHeight(32) : scaleHeight(24),
  },
  
  modalSubMessage: {
    fontSize: isSmallScreen ? scaleText(14) : isTabletScreen ? scaleText(20) : scaleText(16),
    fontFamily: theme.fonts.primary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: scaleHeight(theme.spacing.xl),
    lineHeight: isSmallScreen ? scaleHeight(18) : isTabletScreen ? scaleHeight(28) : scaleHeight(22),
    fontStyle: 'italic',
  },
  
  modalButton: {
    backgroundColor: theme.colors.postItPink,
    paddingVertical: scaleHeight(isSmallScreen ? 12 : isTabletScreen ? 18 : theme.spacing.md),
    paddingHorizontal: scaleWidth(isSmallScreen ? 25 : isTabletScreen ? 40 : theme.spacing.xl),
    borderRadius: scale(20),
    borderTopLeftRadius: scale(5),
    shadowColor: '#000',
    shadowOffset: {
      width: scale(3),
      height: scale(3),
    },
    shadowOpacity: 0.3,
    shadowRadius: scale(6),
    elevation: 6,
    transform: [{ rotate: '1deg' }],
  },
  
  modalButtonText: {
    fontSize: isSmallScreen ? scaleText(16) : isTabletScreen ? scaleText(24) : scaleText(18),
    fontFamily: theme.fonts.primaryBold,
    color: '#D32F2F',
    textAlign: 'center',
  },
});

export default AgeVerificationScreen;