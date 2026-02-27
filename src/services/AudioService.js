import { Platform } from 'react-native';

let Audio;
if (Platform.OS !== 'web') {
  Audio = require('expo-av').Audio;
}

const isWeb = Platform.OS === 'web';
const COOLDOWN_MS = 100;

const SFX_REGISTRY = {
  beer: { source: require('../../assets/sounds/beer.can.sound.mp3'), poolSize: 3 },
  wine: { source: require('../../assets/sounds/wine-pop.mp3'), poolSize: 3 },
  bell: { source: require('../../assets/sounds/school.bell.mp3'), poolSize: 2 },
  roulette: { source: require('../../assets/sounds/Roulette.Spin.mp3'), poolSize: 1 },
  bottle: { source: require('../../assets/sounds/bottle.spin.mp3'), poolSize: 1 },
  pouring: { source: require('../../assets/sounds/pouring.shot.mp3'), poolSize: 1 },
};

class WebManagedSound {
  constructor(audioElement) {
    this._el = audioElement;
  }

  async playAsync() {
    try { await this._el.play(); } catch (e) {}
  }

  async setVolumeAsync(v) {
    this._el.volume = Math.max(0, Math.min(1, v));
  }

  async setPositionAsync(ms) {
    this._el.currentTime = ms / 1000;
  }

  async pauseAsync() {
    this._el.pause();
  }

  async replayAsync() {
    this._el.currentTime = 0;
    await this.playAsync();
  }

  async unloadAsync() {
    this._el.pause();
    this._el.src = '';
  }

  async setStatusAsync(status) {
    if (status.volume !== undefined) {
      this._el.volume = Math.max(0, Math.min(1, status.volume));
    }
    if (status.shouldPlay) {
      await this.playAsync();
    }
  }

  async getStatusAsync() {
    return {
      isLoaded: !!this._el.src,
      isPlaying: !this._el.paused,
      positionMillis: this._el.currentTime * 1000,
      durationMillis: (this._el.duration || 0) * 1000,
    };
  }
}

function resolveWebSource(source) {
  if (typeof source === 'string') return source;
  if (typeof source === 'number') return source;
  if (source && source.uri) return source.uri;
  if (source && source.default) return source.default;
  return source;
}

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
    if (isWeb) {
      this.audioModeSet = true;
      return;
    }
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

      if (isWeb) {
        for (const [key, { source, poolSize }] of entries) {
          const instances = [];
          const src = resolveWebSource(source);
          for (let i = 0; i < poolSize; i++) {
            try {
              const audio = new window.Audio(src);
              audio.volume = 0.8;
              audio.preload = 'auto';
              instances.push(new WebManagedSound(audio));
            } catch (error) {
              console.log(`Error preloading ${key}[${i}]:`, error);
            }
          }
          if (instances.length > 0) {
            this.sfxPool.set(key, instances);
            this.sfxIndex.set(key, 0);
          }
        }
        this.sfxReady = true;
        return;
      }

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
    } catch (error) {
      console.log('Error preloading sound effects:', error);
    }
  }

  async initializeBackgroundMusic() {
    if (this.backgroundMusic) return;

    try {
      await this.ensureAudioMode();

      if (isWeb) {
        const src = resolveWebSource(require('../../assets/sounds/PADRINKS.backround.music.mp3'));
        const audio = new window.Audio(src);
        audio.loop = true;
        audio.volume = 0.15;
        this.backgroundMusic = new WebManagedSound(audio);
        try { await audio.play(); } catch (e) {}
        this.isPlaying = true;
        return;
      }

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
      if (!isWeb) {
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
      return null;
    }
  }

  async createManagedSound(soundKey) {
    const entry = SFX_REGISTRY[soundKey];
    if (!entry) return null;

    if (!this.soundEffectsEnabled || this.isMuted) return null;

    try {
      await this.ensureAudioMode();

      if (isWeb) {
        const src = resolveWebSource(entry.source);
        const audio = new window.Audio(src);
        audio.volume = 0.8;
        audio.preload = 'auto';
        return new WebManagedSound(audio);
      }

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
  }

  async cleanup() {
    if (this.backgroundMusic) {
      try {
        await this.backgroundMusic.unloadAsync();
        this.backgroundMusic = null;
        this.isPlaying = false;
      } catch (error) {
        console.log('Error cleaning up background music:', error);
      }
    }

    await this.cleanupAllSounds();
    this.audioModeSet = false;
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
