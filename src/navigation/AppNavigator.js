import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { BackHandler, Platform } from 'react-native';

// Importar pantallas
import SplashScreen from '../screens/auth/SplashScreen';
import AgeVerificationScreen from '../screens/auth/AgeVerificationScreen';
import MainMenuScreen from '../screens/MainMenuScreen';
import CreateGameScreen from '../screens/game/CreateGameScreen';
import LobbyConfigScreen from '../screens/game/LobbyConfigScreen';
import PlayerRegistrationScreen from '../screens/game/PlayerRegistrationScreen';
import SingleDeviceSetupScreen from '../screens/game/SingleDeviceSetupScreen';
import MultiPlayerRegistrationScreen from '../screens/game/MultiPlayerRegistrationScreen';
import CreateLobbyScreen from '../screens/game/CreateLobbyScreen';
import JoinGameScreen from '../screens/game/JoinGameScreen';
import GameScreen from '../screens/game/GameScreen';
import ConnectionTest from '../components/ConnectionTest';

const Stack = createStackNavigator();

const AppNavigator = () => {
  // Bloquear botón de atrás en Android a nivel de navegación
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('🚫 Botón atrás bloqueado (AppNavigator)');
        return true; // Bloquear completamente
      }
    );

    return () => backHandler.remove();
  }, []);

  return (
    <NavigationContainer
      onStateChange={() => {
        // Re-bloquear después de cada cambio de navegación
        if (Platform.OS === 'android') {
          BackHandler.addEventListener('hardwareBackPress', () => {
            console.log('🚫 Botón atrás bloqueado (onStateChange)');
            return true;
          });
        }
      }}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animationEnabled: true,
          headerBackVisible: false,
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="AgeVerification"
          component={AgeVerificationScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="MainMenu"
          component={MainMenuScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="CreateGame"
          component={CreateGameScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="LobbyConfig"
          component={LobbyConfigScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="PlayerRegistration"
          component={PlayerRegistrationScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="SingleDeviceSetup"
          component={SingleDeviceSetupScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="MultiPlayerRegistration"
          component={MultiPlayerRegistrationScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="CreateLobby"
          component={CreateLobbyScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="JoinGame"
          component={JoinGameScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="GameScreen"
          component={GameScreen}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="BackendTest"
          component={ConnectionTest}
          options={{
            animationTypeForReplace: 'push',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;