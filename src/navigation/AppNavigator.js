import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

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
import ConnectionTest from '../components/ConnectionTest';

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
          component={MainMenuScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="CreateGame" 
          component={CreateGameScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="LobbyConfig" 
          component={LobbyConfigScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="PlayerRegistration" 
          component={PlayerRegistrationScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="SingleDeviceSetup" 
          component={SingleDeviceSetupScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="MultiPlayerRegistration" 
          component={MultiPlayerRegistrationScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="CreateLobby" 
          component={CreateLobbyScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="JoinGame" 
          component={JoinGameScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen 
          name="BackendTest" 
          component={ConnectionTest}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;