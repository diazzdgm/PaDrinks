import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch } from 'react-redux';
import { addPlayer } from '../../store/playersSlice';
import { getGameEngine } from '../../game/GameEngine';
import { theme } from '../../styles/theme';
import { useSafeAreaOffsets } from '../../hooks/useSafeAreaOffsets';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera } from 'expo-camera';
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
  isShortHeightDevice,
  getScreenHeight,
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

const MultiPlayerRegistrationScreen = ({ navigation, route }) => {
  // Redux
  const dispatch = useDispatch();

  // Safe area offsets para iOS
  const { leftOffset, rightOffset, topOffset } = useSafeAreaOffsets();

  // Parámetros de navegación
  const {
    gameMode,
    playerCount,
    currentPlayer = 1,
    registeredPlayers = [],
    draftPlayers = {},
    isAddingPlayer = false,
    currentPlayers = []
  } = route.params;
  
  // Estados para el formulario
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState(''); // 'man', 'woman', 'other'
  const [orientation, setOrientation] = useState(''); // 'men', 'women', 'both'
  const [playerPhoto, setPlayerPhoto] = useState(null); // 'photo' o emoji
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  
  // Estados para modal de error
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const leftSideAnim = useRef(new Animated.Value(-300)).current;
  const rightSideAnim = useRef(new Animated.Value(300)).current;
  const emojiModalScale = useRef(new Animated.Value(0)).current;
  const emojiModalOpacity = useRef(new Animated.Value(0)).current;
  
  // Animaciones para modal de error
  const errorModalScale = useRef(new Animated.Value(0)).current;
  const errorModalOpacity = useRef(new Animated.Value(0)).current;
  
  // audioService gestiona los sonidos automáticamente
  
  // Estado y animación para el botón de mute
  const [isMuted, setIsMuted] = useState(audioService.isMusicMuted);
  const muteButtonScale = useRef(new Animated.Value(1)).current;

  // Efecto para restaurar datos SOLO cuando cambie currentPlayer (nueva navegación)
  useEffect(() => {
    console.log(`🔄 Jugador cambió a: ${currentPlayer}`);
    console.log(`📋 DraftPlayers:`, draftPlayers);
    console.log(`✅ RegisteredPlayers:`, registeredPlayers);
    
    // Primero buscar en jugadores ya registrados
    const registeredPlayer = registeredPlayers.find(player => player.playerId === currentPlayer);
    if (registeredPlayer) {
      // Restaurar datos de jugador ya completado
      setNickname(registeredPlayer.nickname || '');
      setGender(registeredPlayer.gender || '');
      setOrientation(registeredPlayer.orientation || '');
      setPlayerPhoto(registeredPlayer.photo || null);
      setSelectedEmoji(registeredPlayer.emoji || '');
      setPhotoUri(registeredPlayer.photoUri || null);
      console.log(`✅ Restaurando jugador YA REGISTRADO ${currentPlayer}:`, registeredPlayer);
    } else {
      // Si no está registrado, buscar en borradores
      const currentPlayerDraft = draftPlayers[currentPlayer];
      if (currentPlayerDraft) {
        // Restaurar datos de borrador
        setNickname(currentPlayerDraft.nickname || '');
        setGender(currentPlayerDraft.gender || '');
        setOrientation(currentPlayerDraft.orientation || '');
        setPlayerPhoto(currentPlayerDraft.playerPhoto || null);
        setSelectedEmoji(currentPlayerDraft.selectedEmoji || '');
        setPhotoUri(currentPlayerDraft.photoUri || null);
        console.log(`📝 Restaurando BORRADOR del jugador ${currentPlayer}:`, currentPlayerDraft);
      } else {
        // Limpiar formulario para jugador completamente nuevo
        setNickname('');
        setGender('');
        setOrientation('');
        setPlayerPhoto(null);
        setSelectedEmoji('');
        setPhotoUri(null);
        console.log(`🆕 Nuevo jugador ${currentPlayer}, campos limpiados`);
      }
    }
  }, [currentPlayer]); // SOLO depende de currentPlayer, no de los arrays que cambian

  useFocusEffect(
    React.useCallback(() => {
      // Sincronizar estado de mute cuando regresamos a la pantalla
      setIsMuted(audioService.isMusicMuted);
      
      // Animaciones de entrada
      startEntranceAnimations();
      
      return () => {
        // audioService gestiona automáticamente la limpieza
      };
    }, [])
  );

  // audioService gestiona automáticamente la limpieza de sonidos
  // No necesitamos cleanupSound manual

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
    // audioService gestiona automáticamente la limpieza, no necesitamos guardar referencia
    await audioService.playSoundEffect(
      require('../../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );
    console.log('🍺 Reproduciendo sonido de lata de cerveza...');
  };

  const playWinePopSound = async () => {
    await audioService.playSoundEffect(
      require('../../../assets/sounds/wine-pop.mp3'),
      { volume: 0.8 }
    );
    console.log('🍷 Reproduciendo sonido de wine-pop...');
  };

  const handleGenderSelect = (selectedGender) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playWinePopSound();
    setGender(selectedGender);
  };

  const handleOrientationSelect = (selectedOrientation) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playWinePopSound();
    setOrientation(selectedOrientation);
  };

  const handleTakePhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playWinePopSound();
    
    try {
      // Solicitar permisos de cámara
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        showError('📷 Permisos de Cámara\n\nNecesitamos acceso a tu cámara para tomar una foto.');
        return;
      }
      
      // Opciones para la cámara
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1.0,
        cameraType: ImagePicker.CameraType.front,
        ...(Platform.OS === 'ios' && {
          presentationStyle: 'fullScreen',
        }),
      };

      // Abrir cámara
      const result = await ImagePicker.launchCameraAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const originalUri = result.assets[0].uri;
        const { width: imgWidth, height: imgHeight } = result.assets[0];

        try {
          const smallerDimension = Math.min(imgWidth, imgHeight);
          const cropX = (imgWidth - smallerDimension) / 2;
          const cropY = (imgHeight - smallerDimension) / 2;

          const imageInfo = await ImageManipulator.manipulateAsync(
            originalUri,
            [
              {
                crop: {
                  originX: cropX,
                  originY: cropY,
                  width: smallerDimension,
                  height: smallerDimension,
                }
              },
              {
                resize: {
                  width: 500,
                  height: 500,
                }
              }
            ],
            {
              compress: 0.8,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );

          setPhotoUri(imageInfo.uri);
          setPlayerPhoto('photo');
          setSelectedEmoji('');
          console.log('📸 Foto procesada exitosamente:', imageInfo.uri);
        } catch (manipError) {
          console.log('Error procesando imagen, usando original:', manipError);
          setPhotoUri(originalUri);
          setPlayerPhoto('photo');
          setSelectedEmoji('');
        }
      }
      
    } catch (error) {
      console.log('Error al tomar foto:', error);
      showError('❌ Error\n\nNo se pudo tomar la foto. Por favor, intenta de nuevo.');
    }
  };

  const handleSelectEmoji = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    playWinePopSound();

    // Simplificar para iOS - solo mostrar el modal sin animaciones complejas
    console.log('📱 Abriendo modal de emojis...');
    setShowEmojiModal(true);

    // Animar solo opacidad para evitar crashes en iOS
    emojiModalOpacity.setValue(0);
    Animated.timing(emojiModalOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      console.log('✅ Modal de emojis abierto');
    });
  };
  
  const handleEmojiSelect = (emoji) => {
    playWinePopSound();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    setSelectedEmoji(emoji);
    setPlayerPhoto('emoji');
    setPhotoUri(null); // Limpiar foto si había una seleccionada
    handleCloseEmojiModal();
  };
  
  const handleCloseEmojiModal = () => {
    playWinePopSound();

    // Animar salida del modal - solo opacidad para iOS
    Animated.timing(emojiModalOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowEmojiModal(false);
      console.log('❌ Modal de emojis cerrado');
    });
  };
  
  // Función para mostrar modal de error
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);

    // Animar solo opacidad para evitar crashes en iOS
    errorModalOpacity.setValue(0);
    Animated.timing(errorModalOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };
  
  // Función para ocultar modal de error
  const hideErrorModal = () => {
    playWinePopSound();

    // Animar salida del modal - solo opacidad para iOS
    Animated.timing(errorModalOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowErrorModal(false);
      setErrorMessage('');
    });
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

  const saveCurrentDraft = () => {
    // Guardar datos del jugador actual (incluso si están incompletos)
    const currentDraft = {
      nickname: nickname || '',
      gender: gender || '',
      orientation: orientation || '',
      playerPhoto: playerPhoto || null,
      selectedEmoji: selectedEmoji || '',
      photoUri: photoUri || null
    };
    
    const updatedDraftPlayers = {
      ...draftPlayers,
      [currentPlayer]: currentDraft
    };
    
    console.log(`💾 Guardando borrador del jugador ${currentPlayer}:`, currentDraft);
    return updatedDraftPlayers;
  };

  const handleGoBack = () => {
    playBeerSound(); // Es navegación, usa beer sound

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    // Si estamos agregando un jugador al juego en curso, regresar al GameScreen
    if (isAddingPlayer) {
      navigation.navigate('GameScreen', {
        gameMode: 'single-device',
        playerCount: currentPlayers.length,
        registeredPlayers: currentPlayers,
        isReturningFromAddPlayer: true // Flag para indicar que no debe reinicializar
      });
      return;
    }

    console.log(`⬅️ BACK PRESSED - Jugador actual: ${currentPlayer}`);
    console.log(`📝 Datos actuales antes de guardar:`, {
      nickname, gender, orientation, playerPhoto, selectedEmoji, photoUri
    });

    if (currentPlayer === 1) {
      // Si es el primer jugador, regresar a SingleDeviceSetup
      // Siempre incluir todos los datos: registeredPlayers + draftPlayers actuales
      const allDraftPlayers = { ...draftPlayers };
      
      // Guardar borrador del jugador 1 si hay datos
      if (nickname || gender || orientation || playerPhoto) {
        const currentDraft = saveCurrentDraft();
        Object.assign(allDraftPlayers, currentDraft);
        console.log(`💾 Guardando datos del jugador 1:`, currentDraft);
      }
      
      // También incluir registeredPlayers como draftPlayers
      registeredPlayers.forEach(player => {
        if (!allDraftPlayers[player.playerId]) {
          allDraftPlayers[player.playerId] = {
            nickname: player.nickname,
            gender: player.gender,
            orientation: player.orientation,
            playerPhoto: player.photo,
            selectedEmoji: player.emoji,
            photoUri: player.photoUri
          };
        }
      });
      
      console.log(`📋 TODOS los datos que se pasan a SingleDevice:`, allDraftPlayers);
      
      // Navegar de vuelta con TODOS los datos
      navigation.replace('SingleDeviceSetup', {
        gameMode,
        playerCount,
        draftPlayers: allDraftPlayers
      });
    } else {
      // Guardar borrador del jugador actual antes de ir hacia atrás
      const updatedDraftPlayers = saveCurrentDraft();
      console.log(`💾 Navegando de jugador ${currentPlayer} a ${currentPlayer - 1}`);
      console.log(`📋 Borradores actualizados:`, updatedDraftPlayers);
      
      // Si no es el primer jugador, regresar al jugador anterior
      // MANTENER todos los jugadores registrados, no eliminar ninguno
      navigation.replace('MultiPlayerRegistration', {
        gameMode,
        playerCount,
        currentPlayer: currentPlayer - 1,
        registeredPlayers, // Mantener TODOS los jugadores registrados
        draftPlayers: updatedDraftPlayers // Pasar los borradores actualizados
      });
    }
  };

  const handleContinue = () => {
    // Validar campos obligatorios
    if (!nickname.trim() || nickname.trim().length < 2) {
      showError('El apodo debe tener al menos 2 caracteres');
      return;
    }
    
    if (!gender) {
      showError('Selecciona tu género para continuar');
      return;
    }
    
    if (!orientation) {
      showError('Selecciona tu orientación sexual para continuar');
      return;
    }
    
    // Validar que tenga foto o emoji
    if (!playerPhoto || (!selectedEmoji && !photoUri)) {
      showError('Selecciona una foto o un emoji como avatar para continuar');
      return;
    }
    
    // Validar nombres duplicados
    if (isAddingPlayer && currentPlayers && currentPlayers.length > 0) {
      // Si estamos agregando un jugador al juego, validar contra jugadores actuales
      const duplicateName = currentPlayers.find(player =>
        player.name &&
        player.name.toLowerCase().trim() === nickname.toLowerCase().trim()
      );

      if (duplicateName) {
        showError(`Ya existe un jugador con el nombre "${nickname.trim()}". Elige un nombre diferente.`);
        return;
      }
    } else if (registeredPlayers && registeredPlayers.length > 0) {
      // Validar nombres duplicados en modo local normal (excluyendo al jugador actual)
      const duplicateName = registeredPlayers.find(player =>
        player.playerId !== currentPlayer && // EXCLUIR el jugador actual
        player.nickname &&
        player.nickname.toLowerCase().trim() === nickname.toLowerCase().trim()
      );

      if (duplicateName) {
        showError(`Ya existe un jugador con el nombre "${nickname.trim()}". Elige un nombre diferente.`);
        return;
      }
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    playBeerSound();

    // Si estamos agregando un jugador al juego en curso
    if (isAddingPlayer) {
      // Datos del nuevo jugador para Redux y GameEngine
      const newPlayerData = {
        id: Date.now().toString(), // Generar ID único
        name: nickname.trim(),
        gender,
        orientation,
        avatar: playerPhoto === 'photo' ? photoUri : selectedEmoji,
        isHost: false
      };

      console.log(`➕ Agregando jugador al juego:`, newPlayerData);

      // Agregar jugador al Redux store
      dispatch(addPlayer(newPlayerData));

      // Agregar jugador al GameEngine
      const gameEngine = getGameEngine();
      const updatedGamePlayers = [...currentPlayers, newPlayerData];
      gameEngine.updatePlayers(updatedGamePlayers);

      // Regresar al GameScreen sin reinicializar el juego
      navigation.navigate('GameScreen', {
        gameMode: 'single-device',
        playerCount: currentPlayers.length + 1,
        registeredPlayers: currentPlayers, // Mantener la referencia a los jugadores originales
        isReturningFromAddPlayer: true // Flag para indicar que no debe reinicializar
      });
      return;
    }

    // Lógica original para registro normal de jugadores
    const currentPlayerData = {
      playerId: currentPlayer,
      nickname: nickname.trim(),
      gender,
      orientation,
      photo: playerPhoto,
      emoji: selectedEmoji,
      photoUri: photoUri,
    };

    // Verificar si el jugador ya existe en la lista (editando jugador existente)
    const existingPlayerIndex = registeredPlayers.findIndex(player => player.playerId === currentPlayer);

    let updatedPlayers;
    if (existingPlayerIndex !== -1) {
      // Actualizar jugador existente
      updatedPlayers = [...registeredPlayers];
      updatedPlayers[existingPlayerIndex] = currentPlayerData;
      console.log(`✏️ Jugador ${currentPlayer} ACTUALIZADO:`, currentPlayerData);
    } else {
      // Agregar nuevo jugador a la lista
      updatedPlayers = [...registeredPlayers, currentPlayerData];
      console.log(`➕ Jugador ${currentPlayer} AGREGADO:`, currentPlayerData);
    }

    if (currentPlayer < playerCount) {
      // Limpiar el borrador del jugador actual ya que se ha completado
      const updatedDraftPlayers = { ...draftPlayers };
      delete updatedDraftPlayers[currentPlayer];

      // Si no es el último jugador, continuar con el siguiente
      navigation.replace('MultiPlayerRegistration', {
        gameMode,
        playerCount,
        currentPlayer: currentPlayer + 1,
        registeredPlayers: updatedPlayers,
        draftPlayers: updatedDraftPlayers // Pasar borradores sin el jugador actual
      });
    } else {
      // Si es el último jugador, finalizar registro
      console.log('Todos los jugadores registrados:', updatedPlayers);

      // Navegar a CreateLobbyScreen con todos los jugadores registrados
      navigation.navigate('CreateLobby', {
        gameMode,
        playMethod: 'single',
        playerCount,
        registeredPlayers: updatedPlayers
      });
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Fondo de papel con líneas */}
      <View style={styles.paperBackground}>
        <View style={styles.notebookLines}>
          {[...Array(notebookLineCount)].map((_, index) => (
            <View
              key={index}
              style={[styles.line, { top: notebookLineSpacing + (index * notebookLineSpacing) }]}
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

      {/* Título */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {isAddingPlayer ? 'AGREGAR NUEVO JUGADOR' : 'REGISTRA LOS JUGADORES'}
        </Text>
        {!isAddingPlayer && (
          <Text style={styles.subtitle}>({currentPlayer}/{playerCount})</Text>
        )}
      </View>

      {/* Contenido principal dividido 35/65 */}
      <View style={styles.mainContent}>
        
        {/* LADO IZQUIERDO (35%) - Foto del Jugador */}
        <Animated.View 
          style={[
            styles.leftSide,
            { transform: [{ translateX: leftSideAnim }] }
          ]}
        >
          <Text style={styles.sectionTitle}>Foto del Jugador</Text>
          
          {/* Recuadro de foto/emoji */}
          <View style={styles.photoContainer}>
            {playerPhoto === 'photo' && photoUri ? (
              <View style={styles.circularPhotoContainer}>
                <Image 
                  source={{ uri: photoUri }}
                  style={styles.playerPhotoImage}
                  resizeMode="cover"
                />
              </View>
            ) : playerPhoto === 'emoji' && selectedEmoji ? (
              <Text style={styles.selectedEmoji}>{selectedEmoji}</Text>
            ) : (
              <Text style={styles.cameraPlaceholder}>📷</Text>
            )}
          </View>
          
          {/* Botones de foto */}
          <View style={styles.photoButtonsContainer}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handleTakePhoto}
              activeOpacity={0.8}
            >
              <Text style={styles.photoButtonText}>📸 Tomar Foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.photoButton, styles.emojiButton]}
              onPress={handleSelectEmoji}
              activeOpacity={0.8}
            >
              <Text style={styles.photoButtonText}>😀 Seleccionar Emoji</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* LADO DERECHO (65%) - Datos del Jugador */}
        <Animated.View 
          style={[
            styles.rightSide,
            { transform: [{ translateX: rightSideAnim }] }
          ]}
        >
          {/* Campo Apodo */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Apodo:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Escribe tu apodo..."
              placeholderTextColor="#999999"
              value={nickname}
              onChangeText={setNickname}
              maxLength={15}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.charCount}>{nickname.length}/15</Text>
          </View>
          
          {/* Campo Género */}
          <View style={[styles.fieldContainer, styles.upperFieldContainer, styles.genderFieldContainer]}>
            <Text style={styles.fieldLabel}>Género:</Text>
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  gender === 'man' && styles.selectedButton,
                  gender === 'man' && styles.selectedButtonMan,
                ]}
                onPress={() => handleGenderSelect('man')}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonEmoji}>👨</Text>
                <Text style={styles.buttonLabel}>Hombre</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  gender === 'woman' && styles.selectedButton,
                  gender === 'woman' && styles.selectedButtonWoman,
                ]}
                onPress={() => handleGenderSelect('woman')}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonEmoji}>👩</Text>
                <Text style={styles.buttonLabel}>Mujer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  gender === 'other' && styles.selectedButton,
                  gender === 'other' && styles.selectedButtonOther,
                ]}
                onPress={() => handleGenderSelect('other')}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonEmoji}>🧑</Text>
                <Text style={styles.buttonLabel}>Otro</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Campo Orientación Sexual */}
          <View style={[styles.fieldContainer, styles.upperFieldContainer, styles.orientationFieldContainer]}>
            <Text style={styles.fieldLabel}>Me gustan los o las:</Text>
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[
                  styles.orientationButton,
                  styles.menButton,
                  orientation === 'men' && styles.selectedOrientationButton,
                  orientation === 'men' && styles.selectedMenButton,
                ]}
                onPress={() => handleOrientationSelect('men')}
                activeOpacity={0.8}
              >
                <Text style={styles.orientationEmoji}>💙</Text>
                <Text style={styles.orientationLabel}>Hombres</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.orientationButton,
                  styles.womenButton,
                  orientation === 'women' && styles.selectedOrientationButton,
                  orientation === 'women' && styles.selectedWomenButton,
                ]}
                onPress={() => handleOrientationSelect('women')}
                activeOpacity={0.8}
              >
                <Text style={styles.orientationEmoji}>💗</Text>
                <Text style={styles.orientationLabel}>Mujeres</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.orientationButton,
                  styles.bothButton,
                  orientation === 'both' && styles.selectedOrientationButton,
                  orientation === 'both' && styles.selectedBothButton,
                ]}
                onPress={() => handleOrientationSelect('both')}
                activeOpacity={0.8}
              >
                <Text style={styles.orientationEmoji}>💜</Text>
                <Text style={styles.orientationLabel}>Ambos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Botón continuar - Flecha circular en esquina inferior derecha */}
      <TouchableOpacity
        style={styles.continueArrowButton}
        onPress={handleContinue}
        activeOpacity={0.8}
      >
        <Image 
          source={require('../../../assets/images/Arrow.Sketch.png')}
          style={styles.continueArrowImage}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Modal para selección de emojis - Usando overlay absoluto en lugar de Modal */}
      {showEmojiModal && (
        <View style={styles.absoluteEmojiOverlay}>
          <Animated.View
            style={[
              styles.emojiModalContainer,
              {
                opacity: emojiModalOpacity,
              },
            ]}
          >
            {/* Contenido del modal simplificado */}
            <View style={styles.emojiModalContent}>
              <Text style={styles.emojiModalTitle}>Selecciona tu Emoji</Text>

              {/* Grid de emojis */}
              <View style={styles.emojiGrid}>
                {['😀', '😎', '🤩', '😁', '🥳', '🤪', '😜', '🥰', '😘', '🤗', '😋', '🤠', '🥸', '🤭', '😏', '😌'].map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.emojiOption}
                    onPress={() => handleEmojiSelect(emoji)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emojiOptionText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Botón de cerrar */}
              <TouchableOpacity
                style={styles.emojiModalButton}
                onPress={handleCloseEmojiModal}
                activeOpacity={0.8}
              >
                <Text style={styles.emojiModalButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
      
      {/* Modal de error personalizado - Usando overlay absoluto */}
      {showErrorModal && (
        <View style={styles.absoluteErrorOverlay}>
          <Animated.View
            style={[
              styles.errorModalContainer,
              {
                opacity: errorModalOpacity,
              }
            ]}
          >
            <View style={styles.errorModalContent}>
              <Text style={styles.errorModalTitle}>⚠️ Datos Incompletos</Text>
              <Text style={styles.errorModalMessage}>{errorMessage}</Text>

              {/* Botón de cerrar */}
              <TouchableOpacity
                style={styles.errorModalButton}
                onPress={hideErrorModal}
                activeOpacity={0.8}
              >
                <Text style={styles.errorModalButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
};

// Obtener información del dispositivo para estilos dinámicos
const width = SCREEN_WIDTH;
const height = SCREEN_HEIGHT;
const deviceType = getDeviceType();
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();
const screenHeight = getScreenHeight();
const notebookLineSpacing = isTabletScreen ? 15 : scaleByContent(25, 'spacing');
const notebookLineCount = Math.ceil(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / notebookLineSpacing) + 2;

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
    left: scaleByContent(isSmallScreen ? 80 : isTabletScreen ? 120 : 100, 'spacing'),
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
    left: scaleByContent(isSmallScreen ? 75 : isTabletScreen ? 115 : 95, 'spacing'),
    top: 0,
    bottom: 0,
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
    opacity: 0.5,
  },
  
  holesPunch: {
    position: 'absolute',
    left: scaleByContent(isSmallScreen ? 25 : isTabletScreen ? 35 : 30, 'spacing'),
    top: scaleByContent(60, 'spacing'),
    bottom: scaleByContent(60, 'spacing'),
    width: scaleByContent(25, 'spacing'),
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  hole: {
    width: scaleByContent(isSmallScreen ? 15 : isTabletScreen ? 22 : 18, 'spacing'),
    height: scaleByContent(isSmallScreen ? 15 : isTabletScreen ? 22 : 18, 'spacing'),
    borderRadius: scaleBorder(isSmallScreen ? 7.5 : isTabletScreen ? 11 : 10),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
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
    top: scaleByContent(isSmallScreen ? 30 : isTabletScreen ? 50 : 40, 'spacing'),
    left: scaleByContent(isSmallScreen ? 20 : isTabletScreen ? 40 : 30, 'spacing'),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scaleByContent(isSmallScreen ? 15 : isTabletScreen ? 25 : 20, 'spacing'),
    paddingVertical: scaleByContent(isSmallScreen ? 8 : isTabletScreen ? 12 : 10, 'spacing'),
    borderRadius: scaleBorder(15),
    borderTopLeftRadius: scaleBorder(5),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
    transform: [{ rotate: '0deg' }],
    zIndex: 10,
  },
  
  backButtonText: {
    fontSize: scaleByContent(isSmallScreen ? 14 : isTabletScreen ? 20 : 16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Título
  titleContainer: {
    alignItems: 'center',
    paddingTop: isTabletScreen ? 80 : scaleByContent(isSmallScreen ? 20 : 5, 'spacing'),
    marginBottom: scaleByContent(isTabletScreen ? 5 : 15, 'spacing'),
  },
  
  title: {
    fontSize: scaleByContent(isSmallScreen ? 20 : 24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(3, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },
  
  subtitle: {
    fontSize: scaleByContent(isSmallScreen ? 12 : isTabletScreen ? 18 : 14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    textAlign: 'center',
    transform: [{ rotate: '0deg' }],
  },
  
  // Contenido principal
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: scaleByContent(isSmallScreen ? 90 : isTabletScreen ? 150 : 120, 'spacing'),
    paddingBottom: scaleByContent(isShortHeight ? 35 : isTabletScreen ? 25 : 55, 'spacing'),
    marginTop: scaleByContent(isTabletScreen ? -5 : -20, 'spacing'),
  },
  
  // Lado izquierdo - 35% del ancho
  leftSide: {
    flex: isSmallScreen ? 0.4 : 0.35,
    paddingRight: scaleByContent(isSmallScreen ? 15 : isTabletScreen ? 25 : 20, 'spacing'),
    paddingLeft: scaleByContent(isSmallScreen ? 15 : isTabletScreen ? 25 : 20, 'spacing'),
  },
  
  // Lado derecho - 65% del ancho
  rightSide: {
    flex: isSmallScreen ? 0.6 : 0.65,
    paddingLeft: scaleByContent(isSmallScreen ? 15 : isTabletScreen ? 25 : 20, 'spacing'),
    borderLeftWidth: scaleBorder(2),
    borderLeftColor: '#A8C8EC',
    borderLeftStyle: 'dashed',
    justifyContent: 'space-between',
  },
  
  sectionTitle: {
    fontSize: scaleByContent(isSmallScreen ? 16 : isTabletScreen ? 24 : 18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },
  
  // Contenedor de foto
  photoContainer: {
    width: '100%',
    height: isShortHeight ? scaleByContent(100, 'interactive') : isTabletScreen ? scaleByContent(110, 'interactive') : scaleByContent(150, 'interactive'),
    backgroundColor: '#FFFFFF',
    borderRadius: scaleBorder(15),
    borderTopLeftRadius: scaleBorder(5),
    borderWidth: scaleBorder(3),
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(15, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },
  
  cameraPlaceholder: {
    fontSize: scaleByContent(50, 'icon'),
    opacity: 0.3,
  },
  
  selectedEmoji: {
    fontSize: scaleByContent(60, 'icon'),
  },
  
  circularPhotoContainer: {
    width: scaleByContent(120, 'interactive'),
    height: scaleByContent(120, 'interactive'),
    borderRadius: scaleBorder(60),
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 5,
  },
  
  playerPhotoImage: {
    width: '100%',
    height: '100%',
  },
  
  // Botones de foto
  photoButtonsContainer: {
    gap: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(15, 'spacing'),
  },

  photoButton: {
    backgroundColor: '#FFE082',
    paddingVertical: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(12, 'spacing'),
    paddingHorizontal: scaleByContent(20, 'spacing'),
    borderRadius: scaleBorder(12),
    borderTopLeftRadius: scaleBorder(3),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.15,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
    transform: [{ rotate: '0deg' }],
  },
  
  emojiButton: {
    backgroundColor: '#C8E6C9',
    transform: [{ rotate: '0deg' }],
  },
  
  photoButtonText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  
  // Campos del formulario
  fieldContainer: {
  },

  upperFieldContainer: {
  },

  genderFieldContainer: {
  },

  orientationFieldContainer: {
  },
  
  fieldLabel: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: scaleByContent(5, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },
  
  // Input de texto
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
    borderColor: '#CCCCCC',
    borderRadius: scaleBorder(12),
    borderTopLeftRadius: scaleBorder(3),
    paddingVertical: scaleByContent(12, 'spacing'),
    paddingHorizontal: scaleByContent(16, 'spacing'),
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#000000',
    transform: [{ rotate: '0deg' }],
  },
  
  charCount: {
    fontSize: scaleByContent(12, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#999999',
    textAlign: 'right',
    marginTop: scaleByContent(5, 'spacing'),
  },
  
  // Botones en fila
  buttonsRow: {
    flexDirection: 'row',
    gap: scaleByContent(10, 'spacing'),
  },
  
  // Botones de opción (género)
  optionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(12),
    borderTopLeftRadius: scaleBorder(3),
    paddingVertical: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(10, 'spacing'),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.15,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
    transform: [{ rotate: '0deg' }],
  },
  
  selectedButton: {
    borderColor: '#000000',
    borderWidth: scaleBorder(3),
    transform: [{ rotate: '0deg' }],
  },
  
  selectedButtonMan: {
    backgroundColor: '#BBDEFB', // Azul del tema
  },
  
  selectedButtonWoman: {
    backgroundColor: '#F8BBD9', // Rosa del tema
  },
  
  selectedButtonOther: {
    backgroundColor: '#FFE082', // Amarillo del tema
  },
  
  buttonEmoji: {
    fontSize: scaleByContent(24, 'icon'),
    marginBottom: scaleByContent(5, 'spacing'),
  },
  
  buttonLabel: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Botones de orientación (post-it style)
  orientationButton: {
    flex: 1,
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    borderRadius: scaleBorder(12),
    borderTopLeftRadius: scaleBorder(3),
    paddingVertical: isShortHeight ? scaleByContent(8, 'spacing') : scaleByContent(10, 'spacing'),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.15,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
    transform: [{ rotate: '0deg' }],
  },
  
  menButton: {
    backgroundColor: '#FFFFFF', // Fondo blanco
  },
  
  womenButton: {
    backgroundColor: '#FFFFFF', // Fondo blanco
    transform: [{ rotate: '0deg' }],
  },
  
  bothButton: {
    backgroundColor: '#FFFFFF', // Fondo blanco
    transform: [{ rotate: '0deg' }],
  },
  
  selectedMenButton: {
    backgroundColor: '#BBDEFB', // Azul del tema
  },
  
  selectedWomenButton: {
    backgroundColor: '#F8BBD9', // Rosa del tema
  },
  
  selectedBothButton: {
    backgroundColor: '#E1BEE7', // Morado claro
  },
  
  selectedOrientationButton: {
    borderWidth: scaleBorder(3),
    transform: [{ rotate: '0deg' }],
  },
  
  orientationEmoji: {
    fontSize: scaleByContent(20, 'icon'),
    marginBottom: scaleByContent(5, 'spacing'),
  },
  
  orientationLabel: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Botón continuar - Flecha circular
  continueArrowButton: {
    position: 'absolute',
    bottom: scaleByContent(30, 'spacing'),
    right: scaleByContent(30, 'spacing'),
    width: scaleByContent(60, 'interactive'),
    height: scaleByContent(60, 'interactive'),
    backgroundColor: theme.colors.postItGreen,
    borderRadius: scaleBorder(30),
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(4, 'spacing'), height: scaleByContent(4, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(8, 'spacing'),
    elevation: 8,
    transform: [{ rotate: '5deg' }],
    zIndex: 10,
  },
  
  continueArrowImage: {
    width: scaleByContent(35, 'icon'),
    height: scaleByContent(35, 'icon'),
  },
  
  // Estilos para el botón de mute
  sketchMuteButton: {
    position: 'absolute',
    top: scaleByContent(isSmallScreen ? 20 : isTabletScreen ? 40 : 30, 'spacing'),
    right: scaleByContent(isSmallScreen ? 20 : isTabletScreen ? 40 : 30, 'spacing'),
    width: scaleByContent(isSmallScreen ? 55 : isTabletScreen ? 85 : 70, 'interactive'),
    height: scaleByContent(isSmallScreen ? 55 : isTabletScreen ? 85 : 70, 'interactive'),
    borderRadius: scaleBorder(isSmallScreen ? 27.5 : isTabletScreen ? 42.5 : 35),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 6,
    transform: [{ rotate: '0deg' }],
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
    transform: [{ rotate: '0deg' }],
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
    borderRadius: scaleBorder(2),
    transform: [{ rotate: '45deg' }],
  },

  // Estilos del modal de emojis - Overlay absoluto
  absoluteEmojiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(50, 'spacing'),
  },

  emojiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(50, 'spacing'),
  },
  
  emojiModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleBorder(20),
    padding: scaleByContent(25, 'spacing'),
    maxWidth: scaleByContent(350, 'interactive'),
    width: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: scaleByContent(4, 'spacing'),
    },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(10, 'spacing'),
    elevation: 10,
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
  },
  
  emojiModalPaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: scaleBorder(22),
    backgroundColor: '#F8F6F0',
  },
  
  emojiModalLine: {
    position: 'absolute',
    left: scaleByContent(45, 'spacing'),
    right: scaleByContent(15, 'spacing'),
    height: scaleByContent(1, 'spacing'),
    backgroundColor: '#A8C8EC',
    opacity: 0.4,
  },
  
  emojiModalRedLine: {
    position: 'absolute',
    left: scaleByContent(40, 'spacing'),
    top: scaleByContent(15, 'spacing'),
    bottom: scaleByContent(15, 'spacing'),
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },
  
  emojiModalHoles: {
    position: 'absolute',
    left: scaleByContent(15, 'spacing'),
    top: scaleByContent(40, 'spacing'),
    bottom: scaleByContent(40, 'spacing'),
    width: scaleByContent(20, 'spacing'),
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  emojiModalHole: {
    width: scaleByContent(14, 'spacing'),
    height: scaleByContent(14, 'spacing'),
    borderRadius: scaleBorder(7),
    backgroundColor: '#FFFFFF',
    borderWidth: scaleBorder(2),
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(3, 'spacing'),
    elevation: 3,
  },
  
  emojiModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  emojiModalTitle: {
    fontSize: scaleByContent(20, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(20, 'spacing'),
  },

  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: scaleByContent(10, 'spacing'),
    marginBottom: scaleByContent(20, 'spacing'),
  },

  emojiOption: {
    width: scaleByContent(45, 'interactive'),
    height: scaleByContent(45, 'interactive'),
    backgroundColor: '#F0F0F0',
    borderRadius: scaleBorder(22.5),
    borderWidth: scaleBorder(2),
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emojiOptionText: {
    fontSize: scaleByContent(24, 'icon'),
  },

  emojiModalButton: {
    backgroundColor: '#FFE082',
    paddingHorizontal: scaleByContent(25, 'spacing'),
    paddingVertical: scaleByContent(10, 'spacing'),
    borderRadius: scaleBorder(15),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
  },

  emojiModalButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Estilos para modal de error - Overlay absoluto simplificado
  absoluteErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },

  errorModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleBorder(20),
    padding: scaleByContent(30, 'spacing'),
    maxWidth: scaleByContent(350, 'interactive'),
    width: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: scaleByContent(4, 'spacing'),
    },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(10, 'spacing'),
    elevation: 10,
    borderWidth: scaleBorder(3),
    borderColor: '#FF6B6B',
  },

  errorModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorModalTitle: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
  },

  errorModalMessage: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginBottom: scaleByContent(25, 'spacing'),
    lineHeight: scaleByContent(22, 'text'),
  },

  errorModalButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(12, 'spacing'),
    borderRadius: scaleBorder(15),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
  },

  errorModalButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFFFFF',
  },
});

export default MultiPlayerRegistrationScreen;