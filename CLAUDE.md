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
- **Orientation**: app.json specifies "portrait" but App.js forces landscape mode at runtime
- **No Testing Setup**: No Jest, ESLint, or other testing/linting tools configured
- **No Build Scripts**: Uses default Expo build system
- **Firebase Integration**: React Native Firebase SDK with Auth and Realtime Database modules
- **Connectivity Stack**: Multiple networking options - Bluetooth (BLE Manager), WiFi P2P, and Firebase backend

## Architecture

### Core Application Flow
App.js → AppNavigator → [SplashScreen → AgeVerificationScreen → MainMenuScreen]

The app uses a stack-based navigation where each screen replaces the previous one. The landscape orientation is enforced at the App.js level, overriding the portrait setting in app.json.

### State Management Architecture
Redux store with three main slices, configured with middleware for persistence (though persistence is not actually implemented):
- `gameSlice`: Game state and mechanics
- `playersSlice`: Player management and data  
- `connectionSlice`: Network connectivity status

### Screen Architecture Patterns
All main screens follow similar patterns:
- **Animation System**: Heavy use of `useRef` with `Animated.Value` for complex entrance animations
- **Audio Integration**: `expo-av` with cleanup patterns in `useFocusEffect`
- **Haptic Feedback**: Wrapped in try-catch blocks for platform compatibility
- **Theme Integration**: Consistent use of post-it aesthetic with notebook paper backgrounds

### Key Implementation Patterns

#### MainMenuScreen Architecture
- **Horizontal Split Layout**: Logo on left (40% width), navigation buttons on right (60% width)
- **Complex Animation System**: Staggered entrance animations with logo floating, button scaling, and particle effects
- **Audio System**: Background music with mute functionality using PNG icon (Megaphone.MUTE.png)
- **Post-it Button Design**: Rotated buttons with shadows, glow effects, and particle animations on press

#### Font Loading System
Kalam fonts (Regular/Bold) are loaded asynchronously in App.js. Font loading completion gates the entire app rendering with a loading screen.

#### Audio System Architecture
- **Configuration**: Silent mode playback enabled, duck audio on Android
- **Cleanup Pattern**: All screens implement sound cleanup in `useFocusEffect` return function
- **File Organization**: Audio files in `assets/sounds/` (PADRINKS.backround.music.mp3, beer.can.sound.mp3)
- **Background Music**: Looping background music with volume control and mute functionality

### Design System Implementation
- **Theme File**: Centralized in `src/styles/theme.js` with post-it colors and Kalam fonts
- **Color Palette**: postItYellow (#FFE082), postItGreen (#C8E6C9), postItPink, postItBlue
- **Visual Style**: Notebook paper backgrounds with holes, red margin lines, and horizontal blue lines
- **Typography**: Handwritten feel using Kalam font family throughout

### Navigation and State Flow
```
App.js (Redux Provider + Font Loading)
└── AppNavigator (Stack Navigator)
    ├── SplashScreen (6-second animation sequence)
    ├── AgeVerificationScreen (Legal compliance with exit prevention)
    └── MainMenuScreen (Game mode selection hub)
```

### Key Dependencies Architecture
- **React Navigation**: Stack navigator with gesture disabling and custom animations
- **Redux Toolkit**: State management with non-serializable action ignoring for persistence
- **Expo AV**: Audio playback with complex configuration for cross-platform compatibility
- **Expo Haptics**: Feedback system with error handling for unsupported platforms
- **react-native-svg**: SVG support (installed but MainMenu uses PNG for megaphone icon)
- **Firebase**: Backend integration with Auth and Realtime Database (@react-native-firebase/*)
- **Connectivity Suite**: BLE Manager, WiFi P2P, Framer Motion for advanced animations
- **UI Components**: React Native Paper for material design elements, Vector Icons, Super Grid

## Important Technical Notes

### Animation System
- Use `Animated.Value` refs, never mix with static values in transform arrays
- Complex sequences use `Animated.sequence` and `Animated.parallel`
- Particle effects implemented with arrays of animated values for individual particles

### Audio Management
- All audio requires cleanup in `useFocusEffect` return functions
- Audio configuration must be set before each playback
- Background music uses looping with volume control (15% for background music)

### Image Asset Requirements
- PNG images preferred over SVG for icons (better performance and centering)
- Use `require()` paths relative to component location
- `resizeMode="contain"` for proper scaling within containers

### Platform Compatibility
- Haptic feedback requires try-catch error handling
- Audio configuration differs between iOS and Android
- Orientation locking/unlocking must be handled in App.js lifecycle

### Redux Configuration Discrepancies  
- Store configured for persistence middleware but persistence not implemented
- Serializable check ignores 'persist/PERSIST' actions despite no actual persistence

### Screen-Specific Implementation Details

#### SplashScreen Architecture
- **6-Second Animation Sequence**: Logo drop, scaling, and continuous rotation with haptic feedback
- **Audio Timing**: Pouring sound starts at second 1, plays from 4-second mark in file, gradual fade-out at 5s
- **CircularText Component**: Animated rotating text around logo with dancing effects and 20s rotation cycle
- **Complex Animation Cleanup**: Automatic navigation to AgeVerification after sequence completion

#### AgeVerificationScreen Architecture  
- **Legal Compliance**: Hard-blocks Android back button, forces app exit on underage selection
- **Modal System**: Custom animated modal with notebook paper styling for underage users
- **Dramatic Entrance**: Icon falling animation, question sliding, micro-animations with pulse and blinking
- **Haptic Differentiation**: Medium impact for "Yes", heavy impact for "No" selections

#### Folder Structure Insights
The project uses a feature-based organization:
- **Services Layer**: Dedicated folders for bluetooth/, firebase/, wifi/ connectivity options
- **Game Engine**: Separate game/, dynamics/, engine/, modes/ for game logic architecture  
- **Future Expansion**: Pre-created folders for lobby/, results/, game/ screens indicating planned multiplayer features
- **Component Organization**: Common components separated from feature-specific ones