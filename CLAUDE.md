# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PaDrinks is a React Native drinking game app built with Expo. It's designed for party multiplayer experiences with post-it note aesthetic and landscape orientation. The app supports multiple connectivity options (Bluetooth, WiFi P2P) and features animated shot-pouring effects.

## Development Commands

```bash
# Start development server
expo start

# Run on specific platforms
expo start --android
expo start --ios  
expo start --web
```

## Architecture

### Core Structure
- **App.js**: Main entry point with Redux Provider, font loading (Kalam fonts), and forced landscape orientation
- **src/navigation/AppNavigator.js**: Stack navigator managing app flow (Splash → Age Verification → Main Menu)
- **src/store/**: Redux Toolkit setup with slices for game state, players, and connections
- **src/styles/theme.js**: Centralized theme with post-it colors, Kalam fonts, and paper-like design system

### Key Directories
- **src/screens/**: Screen components organized by feature (auth, game, lobby, results)
- **src/components/**: Reusable UI components (common, connectivity, game-specific)
- **src/services/**: External service integrations (bluetooth, firebase, wifi)
- **src/game/**: Game logic (dynamics, engine, modes)
- **assets/**: Images, fonts (Kalam), sounds (pouring.shot.mp3), and icons

### Design System
- **Theme**: Post-it aesthetic with colors like postItYellow (#FFE082), postItGreen (#C8E6C9)
- **Typography**: Kalam font family (Regular/Bold) for handwritten feel
- **Layout**: Forced landscape mode with notebook paper styling
- **Animations**: Heavy use of React Native Animated API for shot-pouring effects

### State Management
Redux store with three main slices:
- `gameSlice`: Game state and mechanics
- `playersSlice`: Player management and data
- `connectionSlice`: Network connectivity status

### Navigation Flow
1. SplashScreen: Animated loading with shot-pouring sound effect
2. AgeVerificationScreen: Legal compliance screen
3. MainMenu: Temporary implementation with game mode selection

### Key Dependencies
- **Expo SDK 53**: Core framework
- **React Navigation**: Navigation management
- **Redux Toolkit**: State management
- **React Native Paper**: UI components
- **Firebase**: Backend services
- **react-native-ble-manager**: Bluetooth connectivity
- **react-native-wifi-p2p**: WiFi Direct support
- **expo-av**: Audio playback for sound effects

## Development Notes

### Font Loading
Kalam fonts are loaded asynchronously in App.js. Font loading completion gates the main app rendering.

### Orientation Lock
App forces landscape orientation on mount and unlocks on unmount via expo-screen-orientation.

### Audio System
Uses expo-av with configuration for silent mode playback. Sound effects are preloaded and managed with proper cleanup.

### Animation Patterns
Extensive use of Animated.Value refs with complex sequence animations, particularly in SplashScreen for shot-pouring effects.

### Temporary Components
AppNavigator contains a temporary MainMenu component that should be replaced with proper screen implementation.