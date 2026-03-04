import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, BackHandler, Dimensions, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { isWeb } from './src/utils/platform';
import { store } from './src/store';
import { theme } from './src/styles/theme';
import AppNavigator from './src/navigation/AppNavigator';
import audioService from './src/services/AudioService';

let ScreenOrientation, NavigationBar;
if (!isWeb) {
  ScreenOrientation = require('expo-screen-orientation');
  NavigationBar = require('expo-navigation-bar');
}

const requestFullscreen = () => {
  if (!isWeb) return;
  const el = document.documentElement;
  const requestFn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (requestFn) {
    requestFn.call(el).catch(() => {});
  }
};

const getWebBrowserInfo = () => {
  if (!isWeb) return { isIOSSafari: false, isPWA: false, canFullscreen: false };
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
  const canFullscreen = !isIOS && !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  return { isIOSSafari: isIOS && isSafari, isIOS, isPWA, canFullscreen };
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const fullscreenRequested = useRef(false);
  const browserInfo = useRef(isWeb ? getWebBrowserInfo() : {});

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
        setIsFullscreen(!!document.fullscreenElement);
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

  // Bloquear botón de atrás en Android - Con máxima prioridad
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

  if (isWeb && isPortrait) {
    return (
      <View style={styles.portraitOverlay}>
        <Text style={styles.portraitEmoji}>📱</Text>
        <Text style={styles.portraitText}>Gira tu dispositivo</Text>
        <Text style={styles.portraitSubtext}>PaDrinks funciona en modo horizontal</Text>
      </View>
    );
  }

  const handleFirstTouch = () => {
    if (isWeb && !fullscreenRequested.current) {
      fullscreenRequested.current = true;
      const info = browserInfo.current;
      if (info.canFullscreen) {
        requestFullscreen();
      } else if (info.isIOS && !info.isPWA) {
        setShowIOSBanner(true);
      }
    }
  };

  const handleFullscreenPress = () => {
    const info = browserInfo.current;
    if (info.canFullscreen) {
      requestFullscreen();
    } else if (info.isIOS && !info.isPWA) {
      setShowIOSBanner(true);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleFirstTouch}>
      <View style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <StatusBar style="light" hidden={true} />
            <AppNavigator />
          </Provider>
        </SafeAreaProvider>
        {isWeb && !isFullscreen && !browserInfo.current.isPWA && (
          <TouchableOpacity
            style={styles.fullscreenButton}
            onPress={handleFullscreenPress}
            activeOpacity={0.7}
          >
            <Text style={styles.fullscreenIcon}>⛶</Text>
          </TouchableOpacity>
        )}
        {showIOSBanner && (
          <View style={styles.iosBannerOverlay}>
            <View style={styles.iosBanner}>
              <TouchableOpacity style={styles.iosBannerClose} onPress={() => setShowIOSBanner(false)}>
                <Text style={styles.iosBannerCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.iosBannerTitle}>Pantalla completa</Text>
              <Text style={styles.iosBannerText}>
                Para jugar sin la barra del navegador:
              </Text>
              <View style={styles.iosBannerSteps}>
                <Text style={styles.iosBannerStep}>1. Toca el icono compartir  ⬆</Text>
                <Text style={styles.iosBannerStep}>2. Selecciona "Agregar a inicio"</Text>
                <Text style={styles.iosBannerStep}>3. Abre PaDrinks desde tu inicio</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },

  portraitEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },

  portraitText: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Kalam-Bold',
    marginBottom: 10,
  },

  portraitSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Kalam-Regular',
  },

  fullscreenButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },

  fullscreenIcon: {
    fontSize: 22,
    color: 'white',
  },

  iosBannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
  },

  iosBanner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    paddingTop: 32,
    width: 320,
    alignItems: 'center',
  },

  iosBannerClose: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  iosBannerCloseText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },

  iosBannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },

  iosBannerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },

  iosBannerSteps: {
    alignSelf: 'stretch',
    gap: 8,
  },

  iosBannerStep: {
    fontSize: 15,
    color: '#333',
    paddingLeft: 4,
  },
});