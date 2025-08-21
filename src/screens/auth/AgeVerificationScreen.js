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

        {/* Botones de respuesta - Sin animación desde abajo */}
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

        {/* Información adicional con flotación */}
        <Animated.View 
          style={[
            styles.infoContainer,
            {
              transform: [
                {
                  translateY: infoFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -3],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.infoText}>
            Al continuar, confirmas que tienes la edad legal para consumir alcohol en tu país
          </Text>
        </Animated.View>

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

const { width, height } = Dimensions.get('window');

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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
  },
  
  
  // Icono principal
  iconContainer: {
    marginBottom: theme.spacing.xs,
  },
  
  mainIcon: {
    fontSize: 60,
    textAlign: 'center',
  },
  
  // Pregunta
  questionContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  
  question: {
    fontSize: 26,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000', // Negro
    textAlign: 'center',
    transform: [{ rotate: '0.5deg' }],
  },
  
  // Botones
  buttonsContainer: {
    width: '100%',
    maxWidth: 420,
    gap: theme.spacing.sm,
  },
  
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.large,
    borderTopLeftRadius: theme.borderRadius.small,
    shadowColor: '#000',
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    marginVertical: theme.spacing.xs,
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
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    textAlign: 'center',
  },
  
  yesButtonText: {
    color: theme.colors.success,
  },
  
  noButtonText: {
    color: theme.colors.error,
  },
  
  // Información
  infoContainer: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.postItBlue,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.medium,
    borderTopLeftRadius: 0,
    maxWidth: 380,
    transform: [{ rotate: '0.8deg' }],
  },
  
  infoText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 15,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: theme.colors.error,
    textAlign: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.small,
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
    borderRadius: 25,
    padding: theme.spacing.xl,
    maxWidth: 400,
    width: '90%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
    fontSize: 28,
    fontFamily: theme.fonts.primaryBold,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    transform: [{ rotate: '-1deg' }],
  },
  
  modalMessage: {
    fontSize: 18,
    fontFamily: theme.fonts.primary,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 24,
  },
  
  modalSubMessage: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  
  modalButton: {
    backgroundColor: theme.colors.postItPink,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 20,
    borderTopLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ rotate: '1deg' }],
  },
  
  modalButtonText: {
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    color: '#D32F2F',
    textAlign: 'center',
  },
});

export default AgeVerificationScreen;