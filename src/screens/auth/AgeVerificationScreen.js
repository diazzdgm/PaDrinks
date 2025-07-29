import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../styles/theme';

const AgeVerificationScreen = ({ navigation }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  
  // Animaciones
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const buttonsSlide = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    React.useCallback(() => {
      // Bloquear botón de retroceso en Android
      const onBackPress = () => {
        return true; // Prevenir ir hacia atrás
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      // Iniciar animaciones
      startAnimations();

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  const startAnimations = () => {
    // Animación de entrada
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación continua del icono
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleYesPress = () => {
    setSelectedAnswer('yes');
    
    // Pequeña animación de confirmación
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Navegar al menú principal después de una pausa
    setTimeout(() => {
      navigation.replace('MainMenu');
    }, 800);
  };

  const handleNoPress = () => {
    setSelectedAnswer('no');
    
    // Mostrar alerta y cerrar app
    Alert.alert(
      '😔 Lo sentimos',
      'Debes ser mayor de 18 años para usar PaDrinks.\n\n¡Regresa cuando cumplas la mayoría de edad!',
      [
        {
          text: 'Entendido',
          onPress: () => {
            BackHandler.exitApp();
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.paperBackground}>
        
        {/* Doodles decorativos */}
        <View style={[styles.doodle, styles.doodleTop]}>
          <Text style={styles.doodleText}>🎂</Text>
        </View>
        <View style={[styles.doodle, styles.doodleBottom]}>
          <Text style={styles.doodleText}>🎈</Text>
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          
          {/* Icono principal */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: iconPulse }],
              },
            ]}
          >
            <Text style={styles.mainIcon}>🔞</Text>
          </Animated.View>

          {/* Título principal */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Verificación de Edad</Text>
          </View>

          {/* Pregunta principal */}
          <View style={styles.questionContainer}>
            <Text style={styles.question}>
              ¿Eres mayor de 18 años?
            </Text>
            <Text style={styles.subtext}>
              Este juego contiene contenido para adultos
            </Text>
          </View>

          {/* Botones de respuesta */}
          <Animated.View
            style={[
              styles.buttonsContainer,
              {
                transform: [{ translateY: buttonsSlide }],
              },
            ]}
          >
            
            {/* Botón SÍ */}
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

            {/* Botón NO */}
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

          {/* Información adicional */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Al continuar, confirmas que tienes la edad legal para consumir alcohol en tu país
            </Text>
          </View>

        </Animated.View>

        {/* Footer con advertencia */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🚨 Bebe responsablemente • No conduzcas bajo la influencia del alcohol
          </Text>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  paperBackground: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  
  // Doodles
  doodle: {
    position: 'absolute',
    opacity: 0.2,
  },
  
  doodleTop: {
    top: '15%',
    right: '10%',
    transform: [{ rotate: '15deg' }],
  },
  
  doodleBottom: {
    bottom: '20%',
    left: '8%',
    transform: [{ rotate: '-20deg' }],
  },
  
  doodleText: {
    fontSize: 35,
  },
  
  // Icono principal
  iconContainer: {
    backgroundColor: theme.colors.postItPink,
    padding: theme.spacing.xl,
    borderRadius: 50,
    borderTopLeftRadius: 15,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 5,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  
  mainIcon: {
    fontSize: 64,
    textAlign: 'center',
  },
  
  // Título
  titleContainer: {
    backgroundColor: theme.colors.postItYellow,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    borderTopLeftRadius: 0,
    marginBottom: theme.spacing.lg,
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#000',
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.primaryBold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  
  // Pregunta
  questionContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  
  question: {
    fontSize: 24,
    fontFamily: theme.fonts.primaryBold,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    transform: [{ rotate: '0.5deg' }],
  },
  
  subtext: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Botones
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: theme.spacing.md,
  },
  
  button: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.large,
    borderTopLeftRadius: theme.borderRadius.small,
    shadowColor: '#000',
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    marginVertical: theme.spacing.sm,
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
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.postItBlue,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    borderTopLeftRadius: 0,
    maxWidth: 350,
    transform: [{ rotate: '0.8deg' }],
  },
  
  infoText: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.md,
    right: theme.spacing.md,
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: theme.colors.error,
    textAlign: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderStyle: 'dashed',
  },
});

export default AgeVerificationScreen;