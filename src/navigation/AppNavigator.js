import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importar pantallas (solo las que existen)
import SplashScreen from '../screens/auth/SplashScreen';
import AgeVerificationScreen from '../screens/auth/AgeVerificationScreen';

// Componente temporal para MainMenu hasta que lo creemos
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

const TemporaryMainMenu = ({ navigation }) => {
  return (
    <View style={tempStyles.container}>
      <Text style={tempStyles.title}>🍻 PaDrinks</Text>
      <Text style={tempStyles.subtitle}>Menú Principal (Temporal)</Text>
      <TouchableOpacity 
        style={tempStyles.button}
        onPress={() => alert('¡Próximamente!')}
      >
        <Text style={tempStyles.buttonText}>🎯 Crear Partida</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={tempStyles.button}
        onPress={() => alert('¡Próximamente!')}
      >
        <Text style={tempStyles.buttonText}>🚀 Unirse a Partida</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={tempStyles.button}
        onPress={() => alert('¡Próximamente!')}
      >
        <Text style={tempStyles.buttonText}>📱 Un Solo Dispositivo</Text>
      </TouchableOpacity>
    </View>
  );
};

const tempStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 48,
    fontFamily: theme.fonts.primaryBold,
    color: theme.colors.primary,
    marginBottom: 20,
    transform: [{ rotate: '-1deg' }],
  },
  subtitle: {
    fontSize: 18,
    fontFamily: theme.fonts.primary,
    color: theme.colors.textSecondary,
    marginBottom: 40,
    backgroundColor: theme.colors.postItYellow,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    transform: [{ rotate: '1deg' }],
  },
  button: {
    backgroundColor: theme.colors.postItGreen,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: theme.fonts.primaryBold,
    color: theme.colors.text,
  },
});

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animationEnabled: true,
        }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="AgeVerification" 
          component={AgeVerificationScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="MainMenu" 
          component={TemporaryMainMenu}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;