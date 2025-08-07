import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import * as Font from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
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
    
    // No inicializar música aquí - se iniciará desde MainMenuScreen
    
    return () => {
      // Limpiar al cerrar app
      ScreenOrientation.unlockAsync();
      audioService.cleanup();
    };
  }, []);

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