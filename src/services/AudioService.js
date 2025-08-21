import { Audio } from 'expo-av';

class AudioService {
  constructor() {
    this.backgroundMusic = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.soundEffectsEnabled = true; // Control separado para efectos de sonido
  }

  async initializeBackgroundMusic() {
    if (this.backgroundMusic) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: musicObject } = await Audio.Sound.createAsync(
        require('../../assets/sounds/PADRINKS.backround.music.mp3'),
        {
          shouldPlay: true,
          isLooping: true,
          volume: 0.15,
        }
      );
      
      this.backgroundMusic = musicObject;
      this.isPlaying = true;
      console.log('🎵 Música de fondo inicializada globalmente...');
      
    } catch (error) {
      console.log('Error loading background music:', error);
    }
  }

  async playBackgroundMusic() {
    if (!this.backgroundMusic) {
      await this.initializeBackgroundMusic();
      return;
    }

    if (!this.isPlaying && !this.isMuted) {
      try {
        await this.backgroundMusic.playAsync();
        this.isPlaying = true;
        console.log('🎵 Reproduciendo música de fondo...');
      } catch (error) {
        console.log('Error playing background music:', error);
      }
    }
  }

  async pauseBackgroundMusic() {
    if (this.backgroundMusic && this.isPlaying) {
      try {
        await this.backgroundMusic.pauseAsync();
        this.isPlaying = false;
        console.log('⏸️ Pausando música de fondo...');
      } catch (error) {
        console.log('Error pausing background music:', error);
      }
    }
  }

  async toggleMute() {
    this.isMuted = !this.isMuted;
    this.soundEffectsEnabled = !this.isMuted; // Sincronizar efectos de sonido con mute general
    
    if (this.isMuted) {
      await this.pauseBackgroundMusic();
      console.log('🔇 Audio completamente silenciado (música + efectos)');
    } else {
      await this.playBackgroundMusic();
      console.log('🔊 Audio activado (música + efectos)');
    }
    
    return this.isMuted;
  }

  async setVolume(volume) {
    if (this.backgroundMusic) {
      try {
        await this.backgroundMusic.setVolumeAsync(volume);
      } catch (error) {
        console.log('Error setting volume:', error);
      }
    }
  }

  // Método para reproducir efectos de sonido respetando el mute
  async playSoundEffect(soundRequire, options = {}) {
    // Si los efectos están silenciados, no reproducir
    if (!this.soundEffectsEnabled || this.isMuted) {
      console.log('🔇 Efecto de sonido silenciado');
      return null;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: soundObject } = await Audio.Sound.createAsync(
        soundRequire,
        {
          shouldPlay: true,
          isLooping: false,
          volume: options.volume || 0.8,
          ...options
        }
      );
      
      console.log('🔊 Reproduciendo efecto de sonido...');
      return soundObject;
      
    } catch (error) {
      console.log('Error loading sound effect:', error);
      return null;
    }
  }

  async cleanup() {
    if (this.backgroundMusic) {
      try {
        await this.backgroundMusic.unloadAsync();
        this.backgroundMusic = null;
        this.isPlaying = false;
        console.log('🧹 Limpiando servicio de audio...');
      } catch (error) {
        console.log('Error cleaning up audio service:', error);
      }
    }
  }

  // Getter para el estado de mute desde otras pantallas
  get isMusicMuted() {
    return this.isMuted;
  }

  get isMusicPlaying() {
    return this.isPlaying;
  }

  get areSoundEffectsEnabled() {
    return this.soundEffectsEnabled;
  }

  get isAudioMuted() {
    return this.isMuted; // Estado general del audio
  }
}

// Instancia singleton
const audioService = new AudioService();
export default audioService;