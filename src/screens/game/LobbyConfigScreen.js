import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
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
  getDeviceType,
  isSmallDevice,
  isTablet,
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

const LobbyConfigScreen = ({ navigation, route }) => {
  // Redux
  const dispatch = useDispatch();
  
  // Parámetros de navegación con valores por defecto
  const { 
    gameMode = 'classic', 
    roomCode = null, 
    isHost = false, 
    playerData = null, 
    roomData = null 
  } = route.params || {};
  
  // Estados para las selecciones
  const [playMethod, setPlayMethod] = useState('multiple'); // 'multiple' o 'single'
  const [connectionType, setConnectionType] = useState('wifi'); // 'wifi' o 'bluetooth'
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const leftSideAnim = useRef(new Animated.Value(-300)).current;
  const rightSideAnim = useRef(new Animated.Value(300)).current;
  
  // Referencias para sonidos
  const beerSound = useRef(null);
  
  // Estado y animación para el botón de mute
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const muteButtonScale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    React.useCallback(() => {
      // Sincronizar estado de mute cuando regresamos a la pantalla
      setIsMuted(audioService.isMusicMuted);
      
      // Animaciones de entrada
      startEntranceAnimations();
      
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

  const startEntranceAnimations = () => {
    // Resetear valores
    fadeAnim.setValue(0);
    leftSideAnim.setValue(-300);
    rightSideAnim.setValue(300);

    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(leftSideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(rightSideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const playBeerSound = async () => {
    const soundObject = await audioService.playSoundEffect(
      require('../../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );
    
    if (soundObject) {
      beerSound.current = soundObject;
      console.log('🍺 Reproduciendo sonido de lata de cerveza...');
    }
  };

  const handlePlayMethodSelect = (method) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    playBeerSound();
    setPlayMethod(method);
  };

  const handleConnectionSelect = (connection) => {
    // No permitir selección si está en modo un dispositivo
    if (playMethod === 'single') return;
    
    // No permitir selección de Bluetooth (próximamente)
    if (connection === 'bluetooth') {
      console.log('🚫 Bluetooth próximamente - selección bloqueada');
      return;
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    playBeerSound();
    setConnectionType(connection);
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
    
    // Si no hay parámetros de juego válidos, significa que vino de disolver una sala
    // En este caso, ir al MainMenu en lugar de goBack()
    if (!gameMode || (!roomCode && !playerData && !roomData)) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainMenu' }],
      });
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    playBeerSound();
    
    // Navegar según el método de juego seleccionado
    console.log('Configuración:', { gameMode, playMethod, connectionType });
    
    if (playMethod === 'single') {
      // Si seleccionó "Un Dispositivo", ir a SingleDeviceSetupScreen
      navigation.navigate('SingleDeviceSetup', { gameMode });
    } else {
      // Si seleccionó "Múltiples Dispositivos", ir a PlayerRegistration
      navigation.navigate('PlayerRegistration', { gameMode, playMethod, connectionType });
    }
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

      {/* Contenido principal dividido 50/50 */}
      <View style={styles.mainContent}>
        
        {/* LADO IZQUIERDO - Manera de Jugar */}
        <Animated.View 
          style={[
            styles.leftSide,
            { transform: [{ translateX: leftSideAnim }] }
          ]}
        >
          <Text style={styles.sectionTitle}>Manera de Jugar</Text>
          
          <View style={styles.optionsContainer}>
            {/* Múltiples Dispositivos */}
            <TouchableOpacity
              style={[
                styles.optionButton,
                playMethod === 'multiple' && styles.selectedOption,
              ]}
              onPress={() => handlePlayMethodSelect('multiple')}
              activeOpacity={0.8}
            >
              <View style={styles.radioButton}>
                {playMethod === 'multiple' && <View style={styles.radioButtonSelected} />}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Múltiples Dispositivos</Text>
                <Text style={styles.optionSubtitle}>(Recomendable)</Text>
              </View>
            </TouchableOpacity>
            
            {/* Un Dispositivo */}
            <TouchableOpacity
              style={[
                styles.optionButton,
                playMethod === 'single' && styles.selectedOption,
              ]}
              onPress={() => handlePlayMethodSelect('single')}
              activeOpacity={0.8}
            >
              <View style={styles.radioButton}>
                {playMethod === 'single' && <View style={styles.radioButtonSelected} />}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Un Dispositivo</Text>
                <Text style={styles.optionDescription}>El host menciona las dinámicas</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* LADO DERECHO - Tipo de Conexión */}
        <Animated.View 
          style={[
            styles.rightSide,
            { transform: [{ translateX: rightSideAnim }] }
          ]}
        >
          <Text style={[
            styles.sectionTitle,
            playMethod === 'single' && styles.disabledTitle
          ]}>
            Tipo de Conexión
          </Text>
          
          <View style={[
            styles.optionsContainer,
            playMethod === 'single' && styles.disabledContainer
          ]}>
            {/* WiFi */}
            <TouchableOpacity
              style={[
                styles.optionButton,
                connectionType === 'wifi' && styles.selectedOption,
                playMethod === 'single' && styles.disabledOption,
              ]}
              onPress={() => handleConnectionSelect('wifi')}
              activeOpacity={playMethod === 'single' ? 1 : 0.8}
            >
              <View style={styles.radioButton}>
                {connectionType === 'wifi' && playMethod !== 'single' && 
                  <View style={styles.radioButtonSelected} />
                }
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionWithIcon}>
                  <Text style={styles.wifiIcon}>🛜</Text>
                  <Text style={styles.optionTitle}>WiFi</Text>
                </View>
                <Text style={styles.optionDescription}>Conexión por red WiFi</Text>
              </View>
            </TouchableOpacity>
            
            {/* Bluetooth */}
            <TouchableOpacity
              style={[
                styles.optionButton,
                connectionType === 'bluetooth' && styles.selectedOption,
                playMethod === 'single' && styles.disabledOption,
                { opacity: 0.7 }, // Opacity reducida porque es próximamente
              ]}
              onPress={() => handleConnectionSelect('bluetooth')}
              activeOpacity={playMethod === 'single' ? 1 : 0.6}
            >
              <View style={styles.radioButton}>
                {connectionType === 'bluetooth' && playMethod !== 'single' && 
                  <View style={styles.radioButtonSelected} />
                }
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionWithIcon}>
                  <Text style={styles.bluetoothIcon}>📱</Text>
                  <Text style={styles.optionTitle}>Bluetooth</Text>
                </View>
                <Text style={styles.optionDescription}>Conexión directa entre dispositivos</Text>
              </View>
              
              {/* Badge de "Próximamente" */}
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>PRÓXIMAMENTE</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Lista de jugadores conectados - solo si hay playerData o roomData */}
      {(playerData || roomData) && (
        <View style={styles.playersSection}>
          <Text style={styles.playersSectionTitle}>Jugadores en el Lobby</Text>
          
          {/* Jugador actual */}
          {playerData && (
            <View style={styles.playerCard}>
              <View style={styles.playerInfo}>
                {playerData.photoUri ? (
                  <Image 
                    source={{ uri: playerData.photoUri }} 
                    style={styles.playerPhoto}
                  />
                ) : (
                  <View style={styles.playerEmojiContainer}>
                    <Text style={styles.playerEmoji}>
                      {playerData.selectedEmoji || playerData.emoji || '👤'}
                    </Text>
                  </View>
                )}
                
                <View style={styles.playerDetails}>
                  <Text style={styles.playerNickname}>
                    {playerData.nickname}
                    {isHost === false && ' (Tú)'}
                  </Text>
                  <Text style={styles.playerStatus}>
                    {isHost ? 'Host' : 'Jugador'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.playerBadge}>
                <Text style={styles.playerBadgeText}>✓</Text>
              </View>
            </View>
          )}
          
          {/* Mensaje si hay más jugadores esperados */}
          <Text style={styles.waitingMessage}>
            {isHost ? 'Esperando que se unan más jugadores...' : 'Esperando que el host inicie la partida...'}
          </Text>
        </View>
      )}

      {/* Botón continuar */}
      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
        activeOpacity={0.8}
      >
        <Text style={styles.continueButtonText}>Continuar</Text>
        <Text style={styles.continueButtonIcon}>→</Text>
      </TouchableOpacity>
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
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 60,
    paddingBottom: 160,
    paddingHorizontal: 120, // Espacio para agujeros y margen
  },
  
  // Lado izquierdo - 50% del ancho
  leftSide: {
    flex: 1,
    paddingRight: 20,
    paddingLeft: 20,
  },
  
  // Lado derecho - 50% del ancho
  rightSide: {
    flex: 1,
    paddingLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: '#A8C8EC',
    borderLeftStyle: 'dashed',
  },
  
  sectionTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 30,
    transform: [{ rotate: '0.5deg' }],
  },
  
  disabledTitle: {
    color: '#999999',
    opacity: 0.6,
  },
  
  optionsContainer: {
    gap: 20,
  },
  
  disabledContainer: {
    opacity: 0.4,
  },
  
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderTopLeftRadius: 5,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ rotate: '-0.3deg' }],
  },
  
  selectedOption: {
    borderColor: '#000000',
    borderWidth: 3,
    backgroundColor: '#FFE082',
    transform: [{ rotate: '0deg' }],
    shadowOpacity: 0.25,
    elevation: 6,
  },
  
  disabledOption: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666666',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  radioButtonSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
  },
  
  optionContent: {
    flex: 1,
  },
  
  optionWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  optionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: 4,
  },
  
  optionSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    fontStyle: 'italic',
  },
  
  optionDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: '#666666',
  },
  
  wifiIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  
  bluetoothIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  
  // Sección de jugadores
  playersSection: {
    marginHorizontal: 30,
    marginVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 20,
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  
  playersSectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 15,
    transform: [{ rotate: '1deg' }],
  },
  
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.postItYellow,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 15,
    marginVertical: 8,
    transform: [{ rotate: '0.5deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  playerPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: 12,
  },
  
  playerEmojiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  playerEmoji: {
    fontSize: 28,
  },
  
  playerDetails: {
    flex: 1,
  },
  
  playerNickname: {
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: 2,
  },
  
  playerStatus: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: '#666666',
  },
  
  playerBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  playerBadgeText: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
  
  waitingMessage: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
    transform: [{ rotate: '-0.5deg' }],
  },
  
  // Botón continuar
  continueButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    left: '30%',
    right: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    backgroundColor: theme.colors.postItGreen,
    borderRadius: 18,
    borderTopLeftRadius: 5,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ rotate: '1deg' }],
  },
  
  continueButtonText: {
    fontSize: 20,
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    flex: 1,
    textAlign: 'center',
  },
  
  continueButtonIcon: {
    fontSize: 24,
    color: '#2E2E2E',
    marginLeft: 10,
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
  
  // Badge "Próximamente" para Bluetooth
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
});

export default LobbyConfigScreen;