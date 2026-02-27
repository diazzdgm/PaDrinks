import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, BackHandler, Dimensions } from 'react-native';
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

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

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
      return () => {
        window.removeEventListener('resize', checkOrientation);
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

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <StatusBar style="light" hidden={true} />
        <AppNavigator />
      </Provider>
    </SafeAreaProvider>
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
});