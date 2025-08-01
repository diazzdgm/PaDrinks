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

# Clear cache if needed
expo start --clear

# Install dependencies
npm install
```

## Project Configuration

- **Expo SDK**: Version 53 with new architecture enabled
- **Expo Config**: Portrait orientation in app.json but overridden to landscape at runtime
- **No Testing Setup**: No Jest, ESLint, or other testing/linting tools configured
- **No Build Scripts**: Uses default Expo build system

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
1. **SplashScreen**: Enhanced with dramatic falling logo animation, haptic feedback, circular text with dancing letters, notebook paper background with parallax effect, and audio with fade out (6-second duration)
2. **AgeVerificationScreen**: Legal compliance screen
3. **MainMenu**: Temporary implementation with game mode selection

### Key Dependencies
- **Expo SDK 53**: Core framework
- **React Navigation**: Navigation management
- **Redux Toolkit**: State management
- **React Native Paper**: UI components
- **Firebase**: Backend services
- **react-native-ble-manager**: Bluetooth connectivity
- **react-native-wifi-p2p**: WiFi Direct support
- **expo-av**: Audio playback for sound effects
- **expo-haptics**: Haptic feedback system
- **framer-motion**: Animation library (installed but may not be actively used)

## Development Notes

### Font Loading
Kalam fonts are loaded asynchronously in App.js. Font loading completion gates the main app rendering.

### Orientation Lock
App forces landscape orientation on mount and unlocks on unmount via expo-screen-orientation.

### Audio System
Uses expo-av with configuration for silent mode playback. Sound effects are preloaded and managed with proper cleanup.

### Animation Patterns
- **SplashScreen**: Complex sequence with logo falling from above, haptic feedback, parallax background effects, and audio fade out
- **CircularText Component**: Custom circular text animation with optional "dancing" letters effect using individual letter animations
- **Audio Integration**: Sound starts from specific timestamp (4 seconds into file) with smooth fade out
- Extensive use of Animated.Value refs with spring and timing animations

### Special Components
- **CircularText**: Reusable component for animated circular text with configurable radius, font size, and dancing letter effects
- **SplashScreen**: 6-second animated sequence with notebook paper background, falling logo, haptic feedback, and audio

### Temporary Components
AppNavigator contains a temporary MainMenu component that should be replaced with proper screen implementation.

### Important Technical Notes
- Audio files should be accessed with `require()` paths relative to component location
- Haptic feedback requires error handling for platforms that don't support it
- Animation values should not be mixed with static values in transform arrays to avoid "[object Object]" errors
- Font loading is asynchronous and gates app rendering

### Configuration Discrepancies
- **Orientation**: app.json specifies "portrait" but App.js forces landscape mode at runtime
- **New Architecture**: Enabled in app.json for React Native's new architecture
- **Redux Middleware**: Store configured with persistence middleware but persistence not implemented
- **Missing Dev Tools**: No ESLint, Prettier, Jest, or TypeScript configuration files

### Audio Integration Details
- **File Locations**: Audio files in assets/sounds/ (pouring.shot.mp3, beer.can.sound.mp3)
- **Expo AV Configuration**: Silent mode playback enabled, preloading used for performance
- **SplashScreen Audio**: Starts from 4-second timestamp with fade-out effect