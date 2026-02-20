import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  // Dimensions removed - using SCREEN_WIDTH/SCREEN_HEIGHT from responsive
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch } from 'react-redux';
import { theme } from '../../styles/theme';
import { useSafeAreaOffsets } from '../../hooks/useSafeAreaOffsets';
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

  // Safe area offsets para iOS
  const { leftOffset, rightOffset, topOffset } = useSafeAreaOffsets();

  // Parámetros de navegación con valores por defecto
  const { 
    gameMode = 'classic', 
    roomCode = null, 
    isHost = false, 
    playerData = null, 
    roomData = null 
  } = route.params || {};
  
  // Estados para las selecciones
  const [playMethod, setPlayMethod] = useState('single'); // 'multiple' o 'single' - Cambiado a 'single' por defecto ya que múltiples está desactivado
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

  const playWinePopSound = async () => {
    const soundObject = await audioService.playSoundEffect(
      require('../../../assets/sounds/wine-pop.mp3'),
      { volume: 0.8 }
    );

    if (soundObject) {
      console.log('🍷 Reproduciendo sonido de wine-pop...');
    }
  };

  const handlePlayMethodSelect = (method) => {
    // No permitir selección de Múltiples dispositivos (próximamente)
    if (method === 'multiple') {
      console.log('🚫 Múltiples dispositivos próximamente - selección bloqueada');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playWinePopSound();
    setPlayMethod(method);
  };

  const handleConnectionSelect = (connection) => {
    // No permitir selección si está en modo un dispositivo
    if (playMethod === 'single') return;

    // No permitir selección de WiFi (próximamente)
    if (connection === 'wifi') {
      console.log('🚫 WiFi próximamente - selección bloqueada');
      return;
    }

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

    playWinePopSound();
    setConnectionType(connection);
  };

  const toggleMute = async () => {
    playWinePopSound();

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
    playBeerSound(); // Es navegación, usa beer sound

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    // Solo ir al MainMenu si no hay gameMode (significa que vino de disolver una sala)
    // Si hay gameMode, siempre usar goBack() para volver a la pantalla anterior
    if (!gameMode) {
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
          {[...Array(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) >= 1280 ? 50 : Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) < 700 ? 20 : 25)].map((_, index) => (
            <View 
              key={index} 
              style={[styles.line, { top: scaleByContent(40, 'spacing') + (index * scaleByContent(25, 'spacing')) }]} 
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
        style={[
          styles.backButton,
          {
            left: leftOffset,
            top: topOffset + scaleByContent(30, 'spacing'),
          },
        ]}
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
            right: rightOffset,
            top: topOffset + scaleByContent(20, 'spacing'),
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
                { opacity: 0.7 }, // Opacity reducida porque es próximamente
              ]}
              onPress={() => handlePlayMethodSelect('multiple')}
              activeOpacity={0.6}
            >
              <View style={styles.radioButton}>
                {playMethod === 'multiple' && <View style={styles.radioButtonSelected} />}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Múltiples Dispositivos</Text>
                <Text style={styles.optionSubtitle}>(Recomendable)</Text>
              </View>

              {/* Badge de "Próximamente" */}
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>PRÓXIMAMENTE</Text>
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
                { opacity: 0.7 }, // Opacity reducida porque es próximamente
              ]}
              onPress={() => handleConnectionSelect('wifi')}
              activeOpacity={playMethod === 'single' ? 1 : 0.6}
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

              {/* Badge de "Próximamente" */}
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>PRÓXIMAMENTE</Text>
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

// Using SCREEN_WIDTH and SCREEN_HEIGHT from responsive utils instead

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
  
  redMarginLine: {
    position: 'absolute',
    left: scaleByContent(95, 'spacing'),
    top: 0,
    bottom: 0,
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
    opacity: 0.5,
  },
  
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
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
  },
  
  // Botón de regreso
  backButton: {
    position: 'absolute',
    top: scaleByContent(35, 'spacing'),
    left: scaleByContent(25, 'spacing'),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scaleByContent(15, 'spacing'),
    paddingVertical: scaleByContent(8, 'spacing'),
    borderRadius: scaleByContent(12, 'spacing'),
    borderTopLeftRadius: scaleByContent(4, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(3, 'spacing'),
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
    zIndex: 10,
  },

  backButtonText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Contenido principal
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: scaleByContent(60, 'spacing'),
    paddingBottom: scaleByContent(80, 'spacing'),
    paddingHorizontal: scaleByContent(120, 'spacing'), // Espacio para agujeros y margen
  },
  
  // Lado izquierdo - 50% del ancho
  leftSide: {
    flex: 1,
    paddingRight: scaleByContent(20, 'spacing'),
    paddingLeft: scaleByContent(20, 'spacing'),
  },
  
  // Lado derecho - 50% del ancho
  rightSide: {
    flex: 1,
    paddingLeft: scaleByContent(20, 'spacing'),
    borderLeftWidth: scaleByContent(2, 'spacing'),
    borderLeftColor: '#A8C8EC',
    borderLeftStyle: 'dashed',
  },
  
  sectionTitle: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(20, 'spacing'),
    transform: [{ rotate: '0.5deg' }],
  },
  
  disabledTitle: {
    color: '#999999',
    opacity: 0.6,
  },
  
  optionsContainer: {
    gap: scaleByContent(20, 'spacing'),
  },
  
  disabledContainer: {
    opacity: 0.4,
  },
  
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaleByContent(12, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderRadius: scaleByContent(12, 'spacing'),
    borderTopLeftRadius: scaleByContent(4, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.15,
    shadowRadius: scaleByContent(3, 'spacing'),
    elevation: 3,
    transform: [{ rotate: '-0.3deg' }],
  },
  
  selectedOption: {
    borderColor: '#000000',
    borderWidth: scaleByContent(3, 'spacing'),
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
    width: scaleByContent(24, 'interactive'),
    height: scaleByContent(24, 'interactive'),
    borderRadius: scaleByContent(12, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#666666',
    marginRight: scaleByContent(15, 'spacing'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  radioButtonSelected: {
    width: scaleByContent(12, 'spacing'),
    height: scaleByContent(12, 'spacing'),
    borderRadius: scaleByContent(6, 'spacing'),
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
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: scaleByContent(3, 'spacing'),
  },

  optionSubtitle: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    fontStyle: 'italic',
  },

  optionDescription: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
  },
  
  wifiIcon: {
    fontSize: scaleByContent(20, 'icon'),
    marginRight: scaleByContent(8, 'spacing'),
  },
  
  bluetoothIcon: {
    fontSize: scaleByContent(20, 'icon'),
    marginRight: scaleByContent(8, 'spacing'),
  },
  
  // Sección de jugadores
  playersSection: {
    marginHorizontal: scaleByContent(30, 'spacing'),
    marginVertical: scaleByContent(20, 'spacing'),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: scaleByContent(15, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    padding: scaleByContent(20, 'spacing'),
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(6, 'spacing'),
    elevation: 6,
  },
  
  playersSectionTitle: {
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
    transform: [{ rotate: '1deg' }],
  },
  
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.postItYellow,
    borderRadius: scaleByContent(12, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    padding: scaleByContent(15, 'spacing'),
    marginVertical: scaleByContent(8, 'spacing'),
    transform: [{ rotate: '0.5deg' }],
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.2,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
  },
  
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  playerPhoto: {
    width: scaleByContent(50, 'interactive'),
    height: scaleByContent(50, 'interactive'),
    borderRadius: scaleByContent(25, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    marginRight: scaleByContent(12, 'spacing'),
  },
  
  playerEmojiContainer: {
    width: scaleByContent(50, 'interactive'),
    height: scaleByContent(50, 'interactive'),
    borderRadius: scaleByContent(25, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleByContent(12, 'spacing'),
  },
  
  playerEmoji: {
    fontSize: scaleByContent(28, 'icon'),
  },
  
  playerDetails: {
    flex: 1,
  },
  
  playerNickname: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: scaleByContent(2, 'spacing'),
  },
  
  playerStatus: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
  },
  
  playerBadge: {
    width: scaleByContent(30, 'interactive'),
    height: scaleByContent(30, 'interactive'),
    borderRadius: scaleByContent(15, 'spacing'),
    backgroundColor: '#4CAF50',
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  playerBadgeText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
  
  waitingMessage: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginTop: scaleByContent(10, 'spacing'),
    fontStyle: 'italic',
    transform: [{ rotate: '-0.5deg' }],
  },
  
  // Botón continuar
  continueButton: {
    position: 'absolute',
    bottom: scaleByContent(25, 'spacing'),
    alignSelf: 'center',
    left: '30%',
    right: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleByContent(12, 'spacing'),
    paddingHorizontal: scaleByContent(25, 'spacing'),
    backgroundColor: theme.colors.postItGreen,
    borderRadius: scaleByContent(15, 'spacing'),
    borderTopLeftRadius: scaleByContent(4, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(6, 'spacing'),
    elevation: 8,
    transform: [{ rotate: '1deg' }],
  },

  continueButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#2E2E2E',
    flex: 1,
    textAlign: 'center',
  },

  continueButtonIcon: {
    fontSize: scaleByContent(18, 'text'),
    color: '#2E2E2E',
    marginLeft: scaleByContent(8, 'spacing'),
  },
  
  // Estilos para el botón de mute
  sketchMuteButton: {
    position: 'absolute',
    top: scaleByContent(30, 'spacing'),
    right: scaleByContent(30, 'spacing'),
    width: scaleByContent(70, 'interactive'),
    height: scaleByContent(70, 'interactive'),
    borderRadius: scaleByContent(35, 'spacing'),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleByContent(3, 'spacing'),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
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
    height: scaleByContent(3, 'spacing'),
    borderRadius: scaleByContent(2, 'spacing'),
    transform: [{ rotate: '45deg' }],
  },
  
  // Badge "Próximamente" para Bluetooth
  comingSoonBadge: {
    position: 'absolute',
    top: scaleByContent(-10, 'spacing'),
    right: scaleByContent(-10, 'spacing'),
    backgroundColor: '#FF5722',
    paddingHorizontal: scaleByContent(10, 'spacing'),
    paddingVertical: scaleByContent(4, 'spacing'),
    borderRadius: scaleByContent(12, 'spacing'),
    borderWidth: scaleByContent(2, 'spacing'),
    borderColor: '#000000',
    transform: [{ rotate: '15deg' }],
  },
  
  comingSoonText: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
});

export default LobbyConfigScreen;