import { Audio } from 'expo-av';

const COOLDOWN_MS = 100;

const SFX_REGISTRY = {
  beer: { source: require('../../assets/sounds/beer.can.sound.mp3'), poolSize: 3 },
  wine: { source: require('../../assets/sounds/wine-pop.mp3'), poolSize: 3 },
  bell: { source: require('../../assets/sounds/school.bell.mp3'), poolSize: 2 },
  roulette: { source: require('../../assets/sounds/Roulette.Spin.mp3'), poolSize: 1 },
  bottle: { source: require('../../assets/sounds/bottle.spin.mp3'), poolSize: 1 },
  pouring: { source: require('../../assets/sounds/pouring.shot.mp3'), poolSize: 1 },
};

class AudioService {
  constructor() {
    this.backgroundMusic = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.soundEffectsEnabled = true;

    this.sfxPool = new Map();
    this.sfxIndex = new Map();
    this.sfxCooldowns = new Map();
    this.sfxReady = false;
    this.audioModeSet = false;
  }

  async ensureAudioMode() {
    if (this.audioModeSet) return;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    this.audioModeSet = true;
  }

  async preloadSoundEffects() {
    if (this.sfxReady) return;

    try {
      await this.ensureAudioMode();

      const entries = Object.entries(SFX_REGISTRY);
      await Promise.all(entries.map(async ([key, { source, poolSize }]) => {
        const instances = [];
        for (let i = 0; i < poolSize; i++) {
          try {
            const { sound } = await Audio.Sound.createAsync(source, {
              shouldPlay: false,
              volume: 0.8,
            });
            instances.push(sound);
          } catch (error) {
            console.log(`Error preloading ${key}[${i}]:`, error);
          }
        }
        if (instances.length > 0) {
          this.sfxPool.set(key, instances);
          this.sfxIndex.set(key, 0);
        }
      }));

      this.sfxReady = true;
      console.log(`🔊 SFX pool precargado: ${this.sfxPool.size} sonidos`);
    } catch (error) {
      console.log('Error preloading sound effects:', error);
    }
  }

  async initializeBackgroundMusic() {
    if (this.backgroundMusic) return;

    try {
      await this.ensureAudioMode();

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
    this.soundEffectsEnabled = !this.isMuted;

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

  async playSoundEffect(soundKey, options = {}) {
    if (!this.soundEffectsEnabled || this.isMuted) return null;
    if (!this.sfxReady || !this.sfxPool.has(soundKey)) return null;

    const now = Date.now();
    const lastPlayed = this.sfxCooldowns.get(soundKey) || 0;
    if (now - lastPlayed < COOLDOWN_MS) return null;
    this.sfxCooldowns.set(soundKey, now);

    const pool = this.sfxPool.get(soundKey);
    const index = this.sfxIndex.get(soundKey);
    const sound = pool[index];
    this.sfxIndex.set(soundKey, (index + 1) % pool.length);

    try {
      if (options.volume !== undefined && options.volume !== 0.8) {
        await sound.setVolumeAsync(options.volume);
      }
      await sound.replayAsync();
      return sound;
    } catch (error) {
      try {
        const entry = SFX_REGISTRY[soundKey];
        const { sound: newSound } = await Audio.Sound.createAsync(
          entry.source,
          { shouldPlay: true, volume: options.volume || 0.8 }
        );
        pool[index] = newSound;
        return newSound;
      } catch (fallbackError) {
        console.log('Error playing sound effect:', fallbackError);
        return null;
      }
    }
  }

  async createManagedSound(soundKey) {
    const entry = SFX_REGISTRY[soundKey];
    if (!entry) return null;

    if (!this.soundEffectsEnabled || this.isMuted) return null;

    try {
      await this.ensureAudioMode();
      const { sound } = await Audio.Sound.createAsync(entry.source, {
        shouldPlay: false,
        volume: 0.8,
      });
      return sound;
    } catch (error) {
      console.log('Error creating managed sound:', error);
      return null;
    }
  }

  async cleanupAllSounds() {
    for (const [, instances] of this.sfxPool) {
      for (const sound of instances) {
        try {
          await sound.unloadAsync();
        } catch (error) {}
      }
    }
    this.sfxPool.clear();
    this.sfxIndex.clear();
    this.sfxCooldowns.clear();
    this.sfxReady = false;
    console.log('🧹 Pool de sonidos limpiado...');
  }

  async cleanup() {
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

    await this.cleanupAllSounds();
    this.audioModeSet = false;
    console.log('🧹 Servicio de audio completamente limpiado...');
  }

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
    return this.isMuted;
  }
}

const audioService = new AudioService();
export default audioService;
