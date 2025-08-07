import { Audio } from 'expo-av';

class AudioService {
  constructor() {
    this.backgroundMusic = null;
    this.isMuted = false;
    this.isPlaying = false;
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
    
    if (this.isMuted) {
      await this.pauseBackgroundMusic();
    } else {
      await this.playBackgroundMusic();
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
}

// Instancia singleton
const audioService = new AudioService();
export default audioService;