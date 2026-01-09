import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import * as Font from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { store } from './src/store';
import { theme } from './src/styles/theme';
import AppNavigator from './src/navigation/AppNavigator';
import audioService from './src/services/AudioService';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Forzar orientación horizontal
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    // Cargar fuentes Kalam
    loadFonts();

    // Ocultar barra de navegación en Android (modo inmersivo sticky)
    let intervalId;
    if (Platform.OS === 'android') {
      configureNavigationBar();

      // Re-aplicar configuración periódicamente para mantener la barra oculta
      intervalId = setInterval(() => {
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      }, 500);
    }

    // No inicializar música aquí - se iniciará desde MainMenuScreen

    return () => {
      // Limpiar al cerrar app
      ScreenOrientation.unlockAsync();
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

  return (
    <Provider store={store}>
      <StatusBar style="light" hidden={true} />
      <AppNavigator />
    </Provider>
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
});