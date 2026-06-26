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
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import audioService from './src/services/AudioService';
import FullscreenOnboardingScreen from './src/screens/web/FullscreenOnboardingScreen';
import GameSnapshotService from './src/services/GameSnapshotService';
import ResumeGameModal from './src/components/web/ResumeGameModal';
import { hydrateFromSnapshot as hydrateGameFromSnapshot } from './src/store/gameSlice';
import { hydrateFromSnapshot as hydratePlayersFromSnapshot } from './src/store/playersSlice';
import { getGameEngine } from './src/game/GameEngine';
import { onOpenFullscreenOnboarding } from './src/utils/fullscreenOnboardingBus';

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
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [pendingSnapshot, setPendingSnapshot] = useState(null);
  const [showFullscreenOnboarding, setShowFullscreenOnboarding] = useState(false);
  const browserInfo = useRef(isWeb ? getWebBrowserInfo() : {});
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const arrowPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isWeb) return;
    const unsubscribe = onOpenFullscreenOnboarding(() => setShowFullscreenOnboarding(true));
    return unsubscribe;
  }, []);

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
        GameSnapshotService.saveSnapshot(store.getState(), getGameEngine().saveGameState(), null);
      } else if (document.visibilityState === 'visible' && wasPlayingRef.current && !audioService.isMuted) {
        audioService.playBackgroundMusic();
      }
    };

    const onPageHide = () => {
      audioService.pauseBackgroundMusic();
      GameSnapshotService.saveSnapshot(store.getState(), getGameEngine().saveGameState(), null);
    };

    const onBeforeUnload = () => {
      GameSnapshotService.saveSnapshot(store.getState(), getGameEngine().saveGameState(), null);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!isWeb) return;

    const STORAGE_KEY = 'padrinks_reloaded_for_landscape';
    const loadedInLandscape = window.innerWidth > window.innerHeight;

    if (loadedInLandscape) {
      try { sessionStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}
      return;
    }

    let alreadyReloaded = false;
    try { alreadyReloaded = sessionStorage.getItem(STORAGE_KEY) === 'true'; } catch (e) {}
    if (alreadyReloaded) return;

    let hasTriggered = false;
    let reloadTimer = null;

    const onResize = () => {
      if (hasTriggered) return;
      if (window.innerWidth > window.innerHeight) {
        hasTriggered = true;
        try { sessionStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          window.location.reload();
        }, 400);
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    if (!isWeb || !fontsLoaded) return;

    let checkoutResult = null;
    try {
      window.localStorage.removeItem('padrinks_pending_paywall_return');
      const search = new URLSearchParams(window.location.search);
      checkoutResult = search.get('checkout');
    } catch (e) {}

    if (checkoutResult && GameSnapshotService.hasValidSnapshot()) {
      const redirectSnapshot = GameSnapshotService.loadSnapshot();
      if (redirectSnapshot) {
        autoResumeAfterRedirect(redirectSnapshot, checkoutResult);
        return;
      }
    }

    if (!GameSnapshotService.hasValidSnapshot()) return;

    const snapshot = GameSnapshotService.loadSnapshot();
    if (!snapshot) return;

    setPendingSnapshot(snapshot);
    const timer = setTimeout(() => {
      setResumeModalVisible(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  const handleResumeCancel = () => {
    GameSnapshotService.clearSnapshot();
    setResumeModalVisible(false);
    setPendingSnapshot(null);
  };

  const handleResumeContinue = () => {
    if (!pendingSnapshot) {
      setResumeModalVisible(false);
      return;
    }

    store.dispatch(hydrateGameFromSnapshot(pendingSnapshot.redux.game));
    store.dispatch(hydratePlayersFromSnapshot(pendingSnapshot.redux.players));
    getGameEngine().loadGameState(pendingSnapshot.engine);

    audioService.preloadSoundEffects();
    audioService.initializeBackgroundMusic();

    setResumeModalVisible(false);
    setPendingSnapshot(null);

    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{
          name: 'GameScreen',
          params: {
            isResume: true,
            gameScreenState: pendingSnapshot.gameScreen,
            registeredPlayers: pendingSnapshot.gameScreen?.allGamePlayers?.length
              ? pendingSnapshot.gameScreen.allGamePlayers
              : pendingSnapshot.redux.players.playersList,
            gameMode: pendingSnapshot.redux.game.gameSettings?.playMethod || 'single-device',
          },
        }],
      });
    }
  };

  const autoResumeAfterRedirect = (snapshot, checkoutResult) => {
    store.dispatch(hydrateGameFromSnapshot(snapshot.redux.game));
    store.dispatch(hydratePlayersFromSnapshot(snapshot.redux.players));
    getGameEngine().loadGameState(snapshot.engine);

    audioService.preloadSoundEffects();
    audioService.initializeBackgroundMusic();

    try {
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) {}

    const params = {
      isResume: true,
      resumePaywall: true,
      checkoutResult: checkoutResult || null,
      gameScreenState: snapshot.gameScreen,
      registeredPlayers: snapshot.gameScreen?.allGamePlayers?.length
        ? snapshot.gameScreen.allGamePlayers
        : snapshot.redux.players.playersList,
      gameMode: snapshot.redux.game.gameSettings?.playMethod || 'single-device',
    };

    const tryReset = (attempt = 0) => {
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'GameScreen', params }] });
      } else if (attempt < 60) {
        setTimeout(() => tryReset(attempt + 1), 100);
      }
    };
    tryReset();
  };

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
      {resumeModalVisible && (
        <ResumeGameModal
          visible={resumeModalVisible}
          onContinue={handleResumeContinue}
          onCancel={handleResumeCancel}
        />
      )}
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