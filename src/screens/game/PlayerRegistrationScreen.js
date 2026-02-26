import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch } from 'react-redux';
import { setGameSettings } from '../../store/gameSlice';
import { theme } from '../../styles/theme';
import { useSafeAreaOffsets } from '../../hooks/useSafeAreaOffsets';
import SocketService from '../../services/SocketService';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
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

const PlayerRegistrationScreen = ({ navigation, route }) => {
  // Redux
  const dispatch = useDispatch();

  // Safe area offsets para iOS
  const { leftOffset, rightOffset, topOffset } = useSafeAreaOffsets();

  // Parámetros de navegación
  const { gameMode, playMethod, connectionType, isJoining, roomCode, roomData } = route.params;
  
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

  // Función para redimensionar y convertir imagen a base64
  const processImageForUpload = async (uri) => {
    try {
      console.log('🔄 Procesando imagen para reducir tamaño...');
      
      // Redimensionar imagen a 150x150 píxeles con calidad reducida
      const manipulatedImage = await manipulateAsync(
        uri,
        [
          { resize: { width: 150, height: 150 } }
        ],
        { 
          compress: 0.3, // 30% de calidad para reducir tamaño
          format: SaveFormat.JPEG 
        }
      );

      console.log('📏 Imagen original:', uri);
      console.log('📐 Imagen redimensionada:', manipulatedImage.uri);
      
      // Convertir a base64
      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const base64Uri = `data:image/jpeg;base64,${base64}`;
      console.log('📁 Imagen procesada - Tamaño aproximado:', Math.round(base64.length / 1024), 'KB');
      console.log('📁 Base64 (primeros 100 chars):', base64Uri.substring(0, 100) + '...');
      
      return base64Uri;
    } catch (error) {
      console.error('❌ Error procesando imagen:', error);
      return uri; // Fallback a URI original
    }
  };
  
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
    await audioService.playSoundEffect('beer');
  };

  const playWinePopSound = async () => {
    await audioService.playSoundEffect('wine');
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
        allowsEditing: false, // Deshabilitado para evitar barras negras en landscape iOS
        quality: 1.0, // Calidad alta para mejor crop manual
        cameraType: ImagePicker.CameraType.front, // Cámara frontal para selfie
        exif: false, // No incluir metadatos EXIF
      };

      // Abrir cámara
      const result = await ImagePicker.launchCameraAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const originalUri = result.assets[0].uri;
        console.log('📸 Foto tomada exitosamente (original):', originalUri);

        // Center-crop manual a cuadrado para evitar barras negras en iOS landscape
        const { width: imgWidth, height: imgHeight } = result.assets[0];
        const smallerDimension = Math.min(imgWidth, imgHeight);
        const cropX = (imgWidth - smallerDimension) / 2;
        const cropY = (imgHeight - smallerDimension) / 2;

        const croppedImage = await manipulateAsync(
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
              resize: { width: 500, height: 500 }
            }
          ],
          {
            compress: 0.8,
            format: SaveFormat.JPEG
          }
        );

        console.log('✂️ Foto cropeada a cuadrado:', croppedImage.uri);

        // Procesar imagen cropeada (redimensionar y convertir a base64)
        const processedUri = await processImageForUpload(croppedImage.uri);
        setPhotoUri(processedUri);
        setPlayerPhoto('photo');
        setSelectedEmoji(''); // Limpiar emoji si había uno seleccionado
        console.log('📸 Foto procesada y guardada:', processedUri ? 'SUCCESS' : 'FAILED');
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
    setShowEmojiModal(true);

    // Animar entrada del modal
    Animated.timing(emojiModalOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
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

    // Animar salida del modal
    Animated.timing(emojiModalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowEmojiModal(false);
    });
  };
  
  // Función para mostrar modal de error
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);

    // Animar entrada del modal
    Animated.timing(errorModalOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };
  
  // Función para ocultar modal de error
  const hideErrorModal = () => {
    playWinePopSound();

    Animated.timing(errorModalOpacity, {
      toValue: 0,
      duration: 200,
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

  const handleGoBack = () => {
    playBeerSound(); // Es navegación, usa beer sound

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    navigation.goBack();
  };

  const handleContinue = async () => {
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
    
    console.log(`🔍 Validando nombre "${nickname.trim()}" en sala ${roomCode}...`);
    
    // Validar nombres duplicados en modo online
    if (isJoining && SocketService.connected && roomCode) {
      try {
        // Obtener información actual de la sala
        const currentRoomData = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          
          SocketService.socket.emit('getRoomInfo', { roomCode }, (response) => {
            clearTimeout(timeout);
            if (response && response.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || 'Failed to get room info'));
            }
          });
        });
        
        let existingPlayers = [];
        if (currentRoomData && currentRoomData.room && currentRoomData.room.players) {
          existingPlayers = currentRoomData.room.players;
        }
        
        // Verificar si ya existe el nombre (case insensitive)
        const duplicateName = existingPlayers.find(player => {
          const playerNick = player.nickname ? player.nickname.toLowerCase().trim() : '';
          const inputNick = nickname.toLowerCase().trim();
          return playerNick === inputNick;
        });
        
        if (duplicateName) {
          console.log(`❌ Nombre duplicado: "${nickname.trim()}" ya existe`);
          showError(`Ya existe un jugador con el nombre "${nickname.trim()}". Elige un nombre diferente.`);
          return;
        }
        
        console.log(`✅ Nombre "${nickname.trim()}" disponible`);
        
      } catch (error) {
        console.warn('⚠️ Error validando con backend, usando datos estáticos');
        
        // Usar datos estáticos como fallback
        let existingPlayers = [];
        if (roomData && roomData.room && roomData.room.players) {
          existingPlayers = roomData.room.players;
        }
        
        const duplicateName = existingPlayers.find(player => {
          const playerNick = player.nickname ? player.nickname.toLowerCase().trim() : '';
          const inputNick = nickname.toLowerCase().trim();
          return playerNick === inputNick;
        });
        
        if (duplicateName) {
          console.log(`❌ Nombre duplicado (fallback): "${nickname.trim()}"`);
          showError(`Ya existe un jugador con el nombre "${nickname.trim()}". Elige un nombre diferente.`);
          return;
        }
      }
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    playBeerSound();
    
    // Datos del jugador
    const playerData = {
      nickname: nickname.trim(),
      gender,
      orientation,
      photo: playerPhoto,
      emoji: selectedEmoji,
      photoUri: photoUri,
      gameMode,
      playMethod,
      connectionType
    };
    
    console.log('Datos del jugador:', playerData);
    
    // Actualizar configuración del juego en Redux
    dispatch(setGameSettings({
      playMethod: playMethod,
      connectionType: connectionType
    }));
    
    if (isJoining) {
      try {
        // Si hay conexión Socket.IO, unirse a la sala en el backend
        if (SocketService.connected) {
          console.log('🏠 Uniéndose a la sala en el backend con datos completos...');
          
          // Unirse a la sala con todos los datos del jugador
          const joinResult = await SocketService.joinRoom(roomCode, {
            nickname: playerData.nickname,
            gender: playerData.gender,
            orientation: playerData.orientation,
            emoji: playerData.emoji, // Usar directamente playerData.emoji que ya contiene selectedEmoji
            photoUri: playerData.photoUri,
            avatar: playerData.photoUri, // También enviar como avatar para compatibilidad
            photo: playerData.photo
          });
          
          console.log('✅ Jugador unido exitosamente a la sala:', joinResult.room.id);
          console.log('🔍 DEBUG - joinResult completo:', JSON.stringify(joinResult, null, 2));
          console.log('🔍 DEBUG - Jugadores en la respuesta:', joinResult.room.players?.length || 0);
          console.log('🔍 DEBUG - isHost del jugador:', joinResult.isHost);
          
          // Navegar al lobby con la información actualizada
          navigation.navigate('CreateLobby', { 
            roomCode: joinResult.room.id,
            isHost: joinResult.isHost,
            useBackend: true,
            playerData: playerData,
            roomData: joinResult,
            isJoining: true,
            gameMode: joinResult.room.settings?.gameMode || gameMode,
            playMethod: 'multiple',
            connectionType: 'wifi'
          });
          
        } else {
          // Si no hay conexión, ir directo al lobby con datos locales
          console.log('⚠️ Sin conexión backend, uniéndose en modo local');
          navigation.navigate('CreateLobby', { 
            roomCode: roomCode,
            isHost: false,
            useBackend: false,
            playerData: playerData,
            roomData: roomData,
            isJoining: true,
            gameMode: roomData?.room?.settings?.gameMode || gameMode,
            playMethod: 'multiple',
            connectionType: 'wifi'
          });
        }
        
      } catch (error) {
        console.error('❌ Error al unirse a la sala:', error);
        showError('🌐 Error de Conexión\n\nNo se pudo unir a la sala online. El juego continuará en modo local.');
        
        // Navegar automáticamente en modo local tras el error
        setTimeout(() => {
          navigation.navigate('CreateLobby', { 
            roomCode: roomCode,
            isHost: false,
            useBackend: false,
            playerData: playerData,
            roomData: roomData,
            isJoining: true,
            gameMode: gameMode,
            playMethod: 'multiple',
            connectionType: 'local'
          });
        }, 2000);
      }
    } else {
      // Si está creando una sala nueva, ir a CreateLobbyScreen
      navigation.navigate('CreateLobby', { 
        ...route.params,
        playerData 
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
            size={50}
            isMuted={isMuted}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Título */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>REGISTRO DEL JUGADOR</Text>
        <Text style={styles.subtitle}>Personaliza tu perfil</Text>
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

      {/* Modal para selección de emojis */}
      {showEmojiModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.emojiModalWrapper}>
            <Animated.View
              style={[
                styles.emojiModalContainer,
                {
                  opacity: emojiModalOpacity,
                },
              ]}
            >
            {/* Fondo con patrón de libreta */}
            <View style={styles.emojiModalPaper}>
              {/* Líneas de libreta en el modal */}
              {[...Array(6)].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.emojiModalLine, { top: scaleByContent(20, 'spacing') + (index * scaleByContent(25, 'spacing')) }]} 
                />
              ))}
              
              {/* Línea vertical roja (margen) */}
              <View style={styles.emojiModalRedLine} />
              
              {/* Agujeros de perforación */}
              <View style={styles.emojiModalHoles}>
                {[...Array(3)].map((_, index) => (
                  <View key={index} style={styles.emojiModalHole} />
                ))}
              </View>
              
              {/* Contenido del modal */}
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
            </View>
          </Animated.View>
        </View>
      </View>)}

      {/* Modal de error personalizado */}
      {showErrorModal && (
        <View style={styles.absoluteModalOverlay}>
          <View style={styles.modalWrapper}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: errorModalOpacity,
                }
              ]}
            >
            {/* Fondo de papel del modal */}
            <View style={styles.modalPaper}>
              <View style={styles.modalHoles}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.modalHole} />
                ))}
              </View>
              <View style={styles.modalRedLine} />
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>⚠️ Datos Incompletos</Text>
              <Text style={styles.modalSubtitle}>{errorMessage}</Text>

              {/* Botón de cerrar */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.errorButton]}
                  onPress={hideErrorModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.errorButtonText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>)}
    </Animated.View>
  );
};

// Obtener información del dispositivo para estilos dinámicos
const { width: _rw, height: _rh } = Dimensions.get('window');
const width = Math.max(_rw, _rh);
const height = Math.min(_rw, _rh);
const deviceType = getDeviceType();
const isSmallScreen = isSmallDevice();
const isTabletScreen = isTablet();
const isShortHeight = isShortHeightDevice();
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
    height: 1,
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
    paddingTop: scaleByContent(isSmallScreen ? 20 : isTabletScreen ? 20 : 5, 'spacing'),
    marginBottom: scaleByContent(15, 'spacing'),
  },
  
  title: {
    fontSize: scaleByContent(isSmallScreen ? 20 : isTabletScreen ? 32 : 24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(3, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },
  
  subtitle: {
    fontSize: scaleByContent(isSmallScreen ? 12 : isTabletScreen ? 18 : 14, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    transform: [{ rotate: '0deg' }],
  },
  
  // Contenido principal
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: scaleByContent(isSmallScreen ? 90 : isTabletScreen ? 150 : 120, 'spacing'),
    paddingBottom: scaleByContent(isShortHeight ? 35 : 55, 'spacing'),
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
    height: scaleByContent(150, 'interactive'),
    backgroundColor: '#FFFFFF',
    borderRadius: scaleBorder(15),
    borderTopLeftRadius: scaleBorder(5),
    borderWidth: scaleBorder(3),
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
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
    gap: scaleByContent(15, 'spacing'),
  },
  
  photoButton: {
    backgroundColor: '#FFE082',
    paddingVertical: scaleByContent(12, 'spacing'),
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

  orientationFieldContainer: {
  },

  genderFieldContainer: {
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
    paddingVertical: scaleByContent(10, 'spacing'),
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
    paddingVertical: scaleByContent(10, 'spacing'),
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
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },

  // Estilos del modal de emojis
  absoluteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },

  emojiModalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleByContent(30, 'spacing'),
    paddingVertical: scaleByContent(50, 'spacing'),
  },

  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#F8F6F0',
    borderRadius: scaleBorder(25),
    padding: scaleByContent(15, 'spacing'),
    maxWidth: scaleByContent(350, 'interactive'),
    width: '80%',
    minHeight: scaleByContent(280, 'interactive'),
    maxHeight: '65%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: scaleByContent(15, 'spacing'),
    },
    shadowOpacity: 0.4,
    shadowRadius: scaleByContent(25, 'spacing'),
    elevation: 20,
    borderWidth: scaleBorder(3),
    borderColor: '#000000',
    overflow: 'hidden',
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
    justifyContent: 'flex-start',
    paddingLeft: scaleByContent(15, 'spacing'),
    paddingRight: scaleByContent(15, 'spacing'),
    paddingTop: scaleByContent(5, 'spacing'),
    paddingBottom: scaleByContent(5, 'spacing'),
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  
  emojiModalTitle: {
    fontSize: scaleByContent(18, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(15, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },
  
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: scaleByContent(10, 'spacing'),
    marginBottom: scaleByContent(15, 'spacing'),
    maxHeight: scaleByContent(180, 'interactive'),
  },
  
  emojiOption: {
    width: scaleByContent(40, 'interactive'),
    height: scaleByContent(40, 'interactive'),
    backgroundColor: '#FFFFFF',
    borderRadius: scaleBorder(20),
    borderWidth: scaleBorder(2),
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(2, 'spacing'), height: scaleByContent(2, 'spacing') },
    shadowOpacity: 0.1,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 3,
    transform: [{ rotate: '0deg' }],
  },
  
  emojiOptionText: {
    fontSize: scaleByContent(20, 'icon'),
  },
  
  emojiModalButton: {
    backgroundColor: '#FFE082',
    paddingHorizontal: scaleByContent(20, 'spacing'),
    paddingVertical: scaleByContent(8, 'spacing'),
    borderRadius: scaleBorder(15),
    borderTopLeftRadius: scaleBorder(5),
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: scaleByContent(3, 'spacing'), height: scaleByContent(3, 'spacing') },
    shadowOpacity: 0.25,
    shadowRadius: scaleByContent(4, 'spacing'),
    elevation: 4,
    transform: [{ rotate: '0deg' }],
  },
  
  emojiModalButtonText: {
    fontSize: scaleByContent(14, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Estilos para modal de error (consistente con JoinGameScreen)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: width * 0.8,
    maxWidth: scaleByContent(400, 'interactive'),
    backgroundColor: '#F8F6F0',
    borderRadius: scaleBorder(20),
    borderWidth: scaleBorder(3),
    borderColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleByContent(10, 'spacing') },
    shadowOpacity: 0.3,
    shadowRadius: scaleByContent(20, 'spacing'),
    elevation: 20,
  },

  modalPaper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scaleBorder(17),
  },

  modalHoles: {
    position: 'absolute',
    left: scaleByContent(25, 'spacing'),
    top: scaleByContent(40, 'spacing'),
    flexDirection: 'column',
  },

  modalHole: {
    width: scaleByContent(12, 'spacing'),
    height: scaleByContent(12, 'spacing'),
    borderRadius: scaleBorder(6),
    backgroundColor: '#E0E0E0',
    marginBottom: scaleByContent(40, 'spacing'),
  },

  modalRedLine: {
    position: 'absolute',
    left: scaleByContent(50, 'spacing'),
    top: 0,
    bottom: 0,
    width: scaleByContent(2, 'spacing'),
    backgroundColor: '#FF6B6B',
  },

  modalContent: {
    padding: scaleByContent(30, 'spacing'),
    paddingLeft: scaleByContent(70, 'spacing'),
  },

  modalTitle: {
    fontSize: scaleByContent(24, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleByContent(8, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  modalSubtitle: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginBottom: scaleByContent(30, 'spacing'),
    transform: [{ rotate: '0deg' }],
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: scaleByContent(20, 'spacing'),
  },

  modalButton: {
    flex: 1,
    paddingVertical: scaleByContent(15, 'spacing'),
    borderRadius: scaleBorder(12),
    alignItems: 'center',
    marginHorizontal: scaleByContent(5, 'spacing'),
  },

  errorButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: scaleBorder(2),
    borderColor: '#000000',
  },

  errorButtonText: {
    fontSize: scaleByContent(16, 'text'),
    fontFamily: theme.fonts.primaryBold,
    color: '#FFF',
  },
});

export default PlayerRegistrationScreen;