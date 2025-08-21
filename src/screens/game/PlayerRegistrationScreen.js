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
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import audioService from '../../services/AudioService';
import * as Haptics from 'expo-haptics';
import { useDispatch } from 'react-redux';
import { theme } from '../../styles/theme';
import SocketService from '../../services/SocketService';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// 🔊 ICONO PERSONALIZADO USANDO PNG
const CustomMuteIcon = ({ size = 50, isMuted = false }) => {
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

const PlayerRegistrationScreen = ({ navigation, route }) => {
  // Redux
  const dispatch = useDispatch();
  
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
    // audioService gestiona automáticamente la limpieza, no necesitamos guardar referencia
    await audioService.playSoundEffect(
      require('../../../assets/sounds/beer.can.sound.mp3'),
      { volume: 0.8 }
    );
  };

  const handleGenderSelect = (selectedGender) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    playBeerSound();
    setGender(selectedGender);
  };

  const handleOrientationSelect = (selectedOrientation) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    playBeerSound();
    setOrientation(selectedOrientation);
  };

  const handleTakePhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    playBeerSound();
    
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
        allowsEditing: true,
        aspect: [1, 1], // Cuadrado para foto de perfil
        quality: 0.5, // Reducido de 0.8 a 0.5 para menor tamaño
        cameraType: ImagePicker.CameraType.front, // Cámara frontal para selfie
        exif: false, // No incluir metadatos EXIF
      };
      
      // Abrir cámara
      const result = await ImagePicker.launchCameraAsync(options);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const tempUri = result.assets[0].uri;
        console.log('📸 Foto tomada exitosamente (temporal):', tempUri);
        
        // Procesar imagen (redimensionar y convertir a base64)
        const processedUri = await processImageForUpload(tempUri);
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
    
    playBeerSound();
    setShowEmojiModal(true);
    
    // Animar entrada del modal
    Animated.parallel([
      Animated.spring(emojiModalScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(emojiModalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const handleEmojiSelect = (emoji) => {
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
    // Animar salida del modal
    Animated.parallel([
      Animated.timing(emojiModalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(emojiModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowEmojiModal(false);
    });
  };
  
  // Función para mostrar modal de error
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
    
    // Animar entrada del modal
    Animated.parallel([
      Animated.spring(errorModalScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(errorModalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Función para ocultar modal de error
  const hideErrorModal = () => {
    Animated.parallel([
      Animated.timing(errorModalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(errorModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowErrorModal(false);
      setErrorMessage('');
    });
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
      <Modal
        visible={showEmojiModal}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
      >
        <View style={styles.emojiModalOverlay}>
          <Animated.View
            style={[
              styles.emojiModalContainer,
              {
                transform: [{ scale: emojiModalScale }],
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
                  style={[styles.emojiModalLine, { top: 20 + (index * 25) }]} 
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
      </Modal>
      
      {/* Modal de error personalizado */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="none"
        onRequestClose={hideErrorModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: errorModalScale }],
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
      </Modal>
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
  
  // Título
  titleContainer: {
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 15,
  },
  
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 3,
    transform: [{ rotate: '0.5deg' }],
  },
  
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    transform: [{ rotate: '-0.3deg' }],
  },
  
  // Contenido principal
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 120, // Espacio para agujeros y margen
    paddingBottom: 80,
  },
  
  // Lado izquierdo - 35% del ancho
  leftSide: {
    flex: 0.35,
    paddingRight: 20,
    paddingLeft: 20,
  },
  
  // Lado derecho - 65% del ancho
  rightSide: {
    flex: 0.65,
    paddingLeft: 20,
    paddingTop: -5,
    borderLeftWidth: 2,
    borderLeftColor: '#A8C8EC',
    borderLeftStyle: 'dashed',
  },
  
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 15,
    transform: [{ rotate: '0.5deg' }],
  },
  
  // Contenedor de foto
  photoContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderTopLeftRadius: 5,
    borderWidth: 3,
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    transform: [{ rotate: '-0.5deg' }],
  },
  
  cameraPlaceholder: {
    fontSize: 50,
    opacity: 0.3,
  },
  
  selectedEmoji: {
    fontSize: 60,
  },
  
  circularPhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  
  playerPhotoImage: {
    width: '100%',
    height: '100%',
  },
  
  // Botones de foto
  photoButtonsContainer: {
    gap: 15,
  },
  
  photoButton: {
    backgroundColor: '#FFE082',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderTopLeftRadius: 3,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ rotate: '-0.3deg' }],
  },
  
  emojiButton: {
    backgroundColor: '#C8E6C9',
    transform: [{ rotate: '0.4deg' }],
  },
  
  photoButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
  },
  
  // Campos del formulario
  fieldContainer: {
    marginBottom: 10,
  },
  
  upperFieldContainer: {
    marginTop: -12,
  },
  
  orientationFieldContainer: {
    marginTop: -5,
  },
  
  genderFieldContainer: {
    marginTop: -25,
  },
  
  fieldLabel: {
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    marginBottom: 10,
    transform: [{ rotate: '0.3deg' }],
  },
  
  // Input de texto
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: '#000000',
    transform: [{ rotate: '-0.2deg' }],
  },
  
  charCount: {
    fontSize: 12,
    fontFamily: theme.fonts.primary,
    color: '#999999',
    textAlign: 'right',
    marginTop: 5,
  },
  
  // Botones en fila
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  
  // Botones de opción (género)
  optionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ rotate: '-0.2deg' }],
  },
  
  selectedButton: {
    borderColor: '#000000',
    borderWidth: 3,
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
    fontSize: 24,
    marginBottom: 5,
  },
  
  buttonLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Botones de orientación (post-it style)
  orientationButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ rotate: '-0.3deg' }],
  },
  
  menButton: {
    backgroundColor: '#FFFFFF', // Fondo blanco
  },
  
  womenButton: {
    backgroundColor: '#FFFFFF', // Fondo blanco
    transform: [{ rotate: '0.2deg' }],
  },
  
  bothButton: {
    backgroundColor: '#FFFFFF', // Fondo blanco
    transform: [{ rotate: '-0.1deg' }],
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
    borderWidth: 3,
    transform: [{ rotate: '0deg' }],
  },
  
  orientationEmoji: {
    fontSize: 20,
    marginBottom: 5,
  },
  
  orientationLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
  },
  
  // Botón continuar - Flecha circular
  continueArrowButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    backgroundColor: theme.colors.postItGreen,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ rotate: '5deg' }],
    zIndex: 10,
  },
  
  continueArrowImage: {
    width: 35,
    height: 35,
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

  // Estilos del modal de emojis
  emojiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  
  emojiModalContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: 25,
    padding: 15,
    maxWidth: 350,
    width: '80%',
    minHeight: 280,
    maxHeight: '65%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  
  emojiModalPaper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    backgroundColor: '#F8F6F0',
  },
  
  emojiModalLine: {
    position: 'absolute',
    left: 45,
    right: 15,
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.4,
  },
  
  emojiModalRedLine: {
    position: 'absolute',
    left: 40,
    top: 15,
    bottom: 15,
    width: 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.4,
  },
  
  emojiModalHoles: {
    position: 'absolute',
    left: 15,
    top: 40,
    bottom: 40,
    width: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  
  emojiModalHole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  
  emojiModalContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 5,
    paddingBottom: 5,
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  
  emojiModalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 15,
    transform: [{ rotate: '0.5deg' }],
  },
  
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
    maxHeight: 180,
  },
  
  emojiOption: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ rotate: '-1deg' }],
  },
  
  emojiOptionText: {
    fontSize: 20,
  },
  
  emojiModalButton: {
    backgroundColor: '#FFE082',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 15,
    borderTopLeftRadius: 5,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ rotate: '-1deg' }],
  },
  
  emojiModalButtonText: {
    fontSize: 14,
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
    maxWidth: 400,
    backgroundColor: '#F8F6F0',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },

  modalPaper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 17,
  },

  modalHoles: {
    position: 'absolute',
    left: 25,
    top: 40,
    flexDirection: 'column',
  },

  modalHole: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginBottom: 40,
  },

  modalRedLine: {
    position: 'absolute',
    left: 50,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF6B6B',
  },

  modalContent: {
    padding: 30,
    paddingLeft: 70,
  },

  modalTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.primaryBold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    transform: [{ rotate: '-0.5deg' }],
  },

  modalSubtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.primary,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    transform: [{ rotate: '0.3deg' }],
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },

  errorButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#000000',
  },

  errorButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.primaryBold,
    color: '#FFF',
  },
});

export default PlayerRegistrationScreen;