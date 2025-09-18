import { Audio } from 'expo-av';

class AudioService {
  constructor() {
    this.backgroundMusic = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.soundEffectsEnabled = true; // Control separado para efectos de sonido

    // Pool de sonidos para reutilización y mejor gestión de memoria
    this.soundPool = new Map();
    this.activeSounds = new Set();
    this.maxActiveSounds = 5; // Límite de sonidos activos simultáneos
    this.maxPoolSize = 3; // Límite de sonidos en el pool
    this.lastCleanup = Date.now();
    this.cleanupInterval = 30000; // Limpiar cada 30 segundos
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

  // Obtener clave única para el sonido basada en el require
  getSoundKey(soundRequire) {
    // Usar el toString del require como clave única
    return soundRequire.toString();
  }

  // Limpiar sonidos activos que ya terminaron
  async cleanupFinishedSounds() {
    const soundsToRemove = [];

    for (const sound of this.activeSounds) {
      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded || (status.isLoaded && !status.isPlaying)) {
          soundsToRemove.push(sound);
        }
      } catch (error) {
        // Si no se puede obtener el status, asumir que está roto y eliminarlo
        soundsToRemove.push(sound);
      }
    }

    // Remover y limpiar sonidos terminados
    for (const sound of soundsToRemove) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        // Ignorar errores de unload
      }
      this.activeSounds.delete(sound);
    }
  }

  // Limpieza automática periódica
  async performPeriodicCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      await this.cleanupFinishedSounds();

      // Si el pool está muy grande, limpiar sonidos más antiguos
      if (this.soundPool.size > this.maxPoolSize) {
        const keys = Array.from(this.soundPool.keys());
        const keysToRemove = keys.slice(0, keys.length - this.maxPoolSize);

        for (const key of keysToRemove) {
          const sound = this.soundPool.get(key);
          try {
            await sound.unloadAsync();
          } catch (error) {
            // Ignorar errores
          }
          this.soundPool.delete(key);
        }

        console.log(`🧹 Pool limpiado: ${keysToRemove.length} sonidos removidos`);
      }

      this.lastCleanup = now;
    }
  }

  // Método optimizado para reproducir efectos de sonido
  async playSoundEffect(soundRequire, options = {}) {
    // Si los efectos están silenciados, no reproducir
    if (!this.soundEffectsEnabled || this.isMuted) {
      console.log('🔇 Efecto de sonido silenciado');
      return null;
    }

    try {
      // Realizar limpieza periódica
      await this.performPeriodicCleanup();

      // Limpiar sonidos terminados antes de crear uno nuevo
      await this.cleanupFinishedSounds();

      // Si hay demasiados sonidos activos, limpiar los más antiguos
      if (this.activeSounds.size >= this.maxActiveSounds) {
        const oldestSound = this.activeSounds.values().next().value;
        try {
          await oldestSound.unloadAsync();
        } catch (error) {
          // Ignorar errores de unload
        }
        this.activeSounds.delete(oldestSound);
      }

      const soundKey = this.getSoundKey(soundRequire);
      let soundObject = null;

      // Verificar si ya tenemos este sonido en el pool y está disponible
      if (this.soundPool.has(soundKey)) {
        const pooledSound = this.soundPool.get(soundKey);
        try {
          const status = await pooledSound.getStatusAsync();
          if (status.isLoaded && !status.isPlaying) {
            // Reutilizar sonido existente
            soundObject = pooledSound;
            await soundObject.setVolumeAsync(options.volume || 0.8);
            await soundObject.replayAsync();
          }
        } catch (error) {
          // Si el sonido está corrupto, eliminarlo del pool
          this.soundPool.delete(soundKey);
        }
      }

      // Si no pudimos reutilizar, crear uno nuevo
      if (!soundObject) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound: newSoundObject } = await Audio.Sound.createAsync(
          soundRequire,
          {
            shouldPlay: true,
            isLooping: false,
            volume: options.volume || 0.8,
            ...options
          }
        );

        soundObject = newSoundObject;

        // Agregar al pool para reutilización futura
        this.soundPool.set(soundKey, soundObject);

        // Configurar listener para limpiar cuando termine
        soundObject.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            this.activeSounds.delete(soundObject);
          }
        });
      }

      // Agregar a sonidos activos
      this.activeSounds.add(soundObject);

      console.log(`🔊 Reproduciendo efecto de sonido... (Activos: ${this.activeSounds.size}/${this.maxActiveSounds})`);
      return soundObject;

    } catch (error) {
      console.log('Error loading sound effect:', error);
      return null;
    }
  }

  // Método para limpiar todos los sonidos activos
  async cleanupAllSounds() {
    // Limpiar sonidos activos
    for (const sound of this.activeSounds) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        // Ignorar errores de unload
      }
    }
    this.activeSounds.clear();

    // Limpiar pool de sonidos
    for (const [key, sound] of this.soundPool) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        // Ignorar errores de unload
      }
    }
    this.soundPool.clear();

    console.log('🧹 Pool de sonidos limpiado...');
  }

  async cleanup() {
    // Limpiar música de fondo
    if (this.backgroundMusic) {
      try {
        await this.backgroundMusic.unloadAsync();
        this.backgroundMusic = null;
        this.isPlaying = false;
        console.log('🧹 Música de fondo limpiada...');
      } catch (error) {
        console.log('Error cleaning up background music:', error);
      }
    }

    // Limpiar todos los efectos de sonido
    await this.cleanupAllSounds();

    console.log('🧹 Servicio de audio completamente limpiado...');
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