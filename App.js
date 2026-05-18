import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, BackHandler, Dimensions, TouchableOpacity, AppState, Animated, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { isWeb } from './src/utils/platform';
import { isTablet, SCREEN_WIDTH, SCREEN_HEIGHT } from './src/utils/responsive';
import { store } from './src/store';
import { theme } from './src/styles/theme';
import AppNavigator from './src/navigation/AppNavigator';
import audioService from './src/services/AudioService';
import FullscreenOnboardingScreen from './src/screens/web/FullscreenOnboardingScreen';

let ScreenOrientation, NavigationBar;
if (!isWeb) {
  ScreenOrientation = require('expo-screen-orientation');
  NavigationBar = require('expo-navigation-bar');
}

const tryFullscreen = () => {
  if (!isWeb) return Promise.resolve(false);
  const el = document.documentElement;
  const requestFn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (requestFn) {
    const result = requestFn.call(el);
    if (result && result.then) {
      return result.then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
};

const getWebBrowserInfo = () => {
  if (!isWeb) return { isIOS: false, isPWA: false };
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
  return { isIOS, isPWA };
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenOnboarding, setShowFullscreenOnboarding] = useState(() => {
    if (Platform.OS !== 'web') return false;
    if (typeof window === 'undefined') return false;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
                || window.matchMedia('(display-mode: fullscreen)').matches
                || window.navigator.standalone === true;
    if (isPWA) return false;
    if (window.localStorage?.getItem('padrinks_skip_fullscreen_onboarding') === 'true') return false;
    return true;
  });
  const browserInfo = useRef(isWeb ? getWebBrowserInfo() : {});
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const arrowPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isWeb && ScreenOrientation) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }

    loadFonts();

    let intervalId;
    if (Platform.OS === 'android') {
      configureNavigationBar();

      intervalId = setInterval(() => {
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      }, 500);
    }

    if (isWeb) {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }

      const style = document.createElement('style');
      style.textContent = '[role="button"], [data-testid] { cursor: pointer; } body { overflow: hidden; margin: 0; }';
      document.head.appendChild(style);

      const checkOrientation = () => {
        setIsPortrait(window.innerHeight > window.innerWidth);
      };
      checkOrientation();
      window.addEventListener('resize', checkOrientation);

      const onFullscreenChange = () => {
        const isFs = !!document.fullscreenElement;
        setIsFullscreen(isFs);
        if (isFs && screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      };
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);

      return () => {
        window.removeEventListener('resize', checkOrientation);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        document.head.removeChild(style);
        audioService.cleanup();
      };
    }

    return () => {
      if (!isWeb && ScreenOrientation) {
        ScreenOrientation.unlockAsync();
      }
      if (Platform.OS === 'android') {
        if (intervalId) clearInterval(intervalId);
        restoreNavigationBar();
      }
      audioService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isWeb || !isPortrait) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rotateAnim,     { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(arrowPulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(rotateAnim,     { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(arrowPulseAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [isPortrait, rotateAnim, arrowPulseAnim]);

  useEffect(() => {
    if (isWeb) return;

    const wasPlayingRef = { current: false };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        wasPlayingRef.current = audioService.isPlaying;
        audioService.pauseBackgroundMusic();
      } else if (nextAppState === 'active' && wasPlayingRef.current && !audioService.isMuted) {
        audioService.playBackgroundMusic();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isWeb) return;

    const wasPlayingRef = { current: false };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasPlayingRef.current = audioService.isPlaying;
        audioService.pauseBackgroundMusic();
      } else if (document.visibilityState === 'visible' && wasPlayingRef.current && !audioService.isMuted) {
        audioService.playBackgroundMusic();
      }
    };

    const onPageHide = () => {
      audioService.pauseBackgroundMusic();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useEffect(() => {
    if (!isWeb) return;

    const initial = Dimensions.get('window');
    const initialLong = Math.max(initial.width, initial.height);
    const initialShort = Math.min(initial.width, initial.height);
    const mountTime = Date.now();
    let reloadTimer = null;
    let lastFullscreenChange = 0;

    const onFsChange = () => { lastFullscreenChange = Date.now(); };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    const subscription = Dimensions.addEventListener('change', ({ window: win }) => {
      if (Date.now() - lastFullscreenChange < 1500) return;

      const newLong = Math.max(win.width, win.height);
      const newShort = Math.min(win.width, win.height);
      const timeSinceMount = Date.now() - mountTime;
      const longChanged = Math.abs(newLong - initialLong) > 100;
      const shortChanged = Math.abs(newShort - initialShort) > 30;

      if (longChanged || (shortChanged && timeSinceMount < 2000)) {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          window.location.reload();
        }, 600);
      }
    });

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      if (subscription && subscription.remove) subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    // Handler que bloquea completamente el botón atrás
    const blockBackButton = () => {
      console.log('🚫 Botón atrás bloqueado globalmente');
      return true; // Bloquear completamente
    };

    // Registrar el handler con máxima prioridad
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      blockBackButton
    );

    // Registrar un segundo handler como respaldo
    const backHandler2 = BackHandler.addEventListener(
      'hardwareBackPress',
      blockBackButton
    );

    return () => {
      backHandler.remove();
      backHandler2.remove();
    };
  }, []);

  const configureNavigationBar = async () => {
    try {
      // Configurar comportamiento inset-swipe para modo inmersivo sticky
      await NavigationBar.setBehaviorAsync('inset-swipe');

      // Hacer la barra de navegación transparente
      await NavigationBar.setBackgroundColorAsync('#00000001'); // Casi transparente

      // Configurar botones de navegación como light
      await NavigationBar.setButtonStyleAsync('light');

      // Ocultar la barra de navegación
      await NavigationBar.setVisibilityAsync('hidden');

      console.log('🎮 Barra de navegación oculta (modo inmersivo)');
    } catch (error) {
      console.log('⚠️ Error configurando barra de navegación:', error);
    }
  };

  const restoreNavigationBar = async () => {
    try {
      // Restaurar la barra de navegación al salir
      await NavigationBar.setVisibilityAsync('visible');
      console.log('👋 Barra de navegación restaurada');
    } catch (error) {
      console.log('⚠️ Error restaurando barra de navegación:', error);
    }
  };

  const loadFonts = async () => {
    try {
      await Font.loadAsync({
        'Kalam-Regular': require('./assets/fonts/Kalam-Regular.ttf'),
        'Kalam-Bold': require('./assets/fonts/Kalam-Bold.ttf'),
      });
      setFontsLoaded(true);
      console.log('✅ Fuentes Kalam cargadas correctamente');
    } catch (error) {
      console.log('❌ Error loading Kalam fonts:', error);
      setFontsLoaded(true); // Continuar sin fuentes personalizadas
    }
  };

  // Pantalla de carga mientras se preparan las fuentes
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🍻</Text>
        <Text style={styles.loadingSubtext}>Preparando PaDrinks...</Text>
      </View>
    );
  }

  const phoneRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-90deg'],
  });

  const arrowOpacity = arrowPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <StatusBar style="light" hidden={true} />
          <AppNavigator />
        </Provider>
      </SafeAreaProvider>
      {showFullscreenOnboarding && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999997,
          elevation: 999997,
        }}>
          <FullscreenOnboardingScreen onDismiss={() => setShowFullscreenOnboarding(false)} />
        </View>
      )}
      {isWeb && isPortrait && (
        <View style={styles.portraitOverlay} pointerEvents="auto">
          <View style={styles.portraitPaperBackground}>
            <View style={styles.portraitNotebookLines}>
              {[...Array(portraitLineCount)].map((_, i) => (
                <View
                  key={i}
                  style={[styles.portraitLine, { top: portraitLineSpacing + i * portraitLineSpacing }]}
                />
              ))}
            </View>
          </View>

          <View style={styles.portraitContent}>
            <View style={styles.portraitIconRow}>
              <Animated.Image
                source={require('./assets/images/Arrow-Rotation.png')}
                style={[styles.portraitArrow, styles.portraitArrowLeft, { opacity: arrowOpacity }]}
                resizeMode="contain"
              />
              <Animated.Image
                source={require('./assets/images/Smartphone.Sketch.png')}
                style={[styles.portraitPhone, { transform: [{ rotate: phoneRotation }] }]}
                resizeMode="contain"
              />
              <Animated.Image
                source={require('./assets/images/Arrow-Rotation.png')}
                style={[styles.portraitArrow, styles.portraitArrowRight, { opacity: arrowOpacity }]}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.portraitText}>GIRA TU CELULAR</Text>
            <Text style={styles.portraitSubtext}>PaDrinks se juega{'\n'}en modo horizontal</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const portraitLineSpacing = isTablet() ? 18 : 28;
const portraitLineCount = Math.ceil(Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) / portraitLineSpacing) + 4;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },

  loadingText: {
    fontSize: 64,
    marginBottom: 20,
  },

  loadingSubtext: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },

  portraitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F6F0',
    zIndex: 999998,
  },

  portraitPaperBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F6F0',
  },

  portraitNotebookLines: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 20,
    right: 20,
  },

  portraitLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#A8C8EC',
    opacity: 0.6,
  },

  portraitContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  portraitIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },

  portraitPhone: {
    width: 140,
    height: 140,
    marginHorizontal: 16,
  },

  portraitArrow: {
    width: 45,
    height: 45,
  },

  portraitArrowLeft: {},

  portraitArrowRight: {
    transform: [{ scaleX: -1 }],
  },

  portraitText: {
    fontSize: 32,
    color: '#000000',
    fontWeight: 'bold',
    fontFamily: 'Kalam-Bold',
    marginBottom: 14,
    letterSpacing: 1,
    textAlign: 'center',
  },

  portraitSubtext: {
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Kalam-Regular',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.85,
  },

});