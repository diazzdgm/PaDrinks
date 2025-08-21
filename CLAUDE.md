# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PaDrinks is a React Native drinking game app built with Expo. It's designed for party multiplayer experiences with post-it note aesthetic and landscape orientation. The app supports multiple connectivity options (Bluetooth, WiFi P2P) and features animated shot-pouring effects.

## Development Commands

### Frontend (React Native)
```bash
# Start development server
npm start
# or
npx expo start

# Run on specific platforms
npm run android
npm run ios  
npm run web

# Clear cache versions
npm run start:clear
npm run clean:cache

# Install dependencies
npm install
# or
npm run expo:install

# Full clean and reinstall (for persistent issues)
npm run clean

# Tunnel mode for external device testing
npm run start:tunnel

# Run diagnostics
npm run expo:doctor

# Prebuild for native builds
npm run prebuild
```

### Backend (Node.js + Socket.IO)
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Start backend development server (with auto-reload)
npm run dev

# Start backend production server
npm start

# Test backend connectivity
curl http://localhost:3001/health

# Run comprehensive backend API tests
node test-api.js
```

## Project Configuration

- **Expo SDK**: Version 53 with new architecture enabled
- **React Version**: React 19.0.0 with React Native 0.79.5
- **Orientation**: app.json specifies "portrait" but App.js forces landscape mode at runtime via expo-screen-orientation
- **No Testing Setup**: No Jest, ESLint, or other testing/linting tools configured
- **No Build Scripts**: Uses default Expo build system
- **Firebase Integration**: React Native Firebase SDK with Auth and Realtime Database modules
- **Connectivity Stack**: Multiple networking options - Bluetooth (BLE Manager), WiFi P2P, Firebase backend, and Socket.IO real-time communication
- **Backend Integration**: Node.js + Express + Socket.IO backend server for multiplayer functionality
- **Image Processing**: expo-image-manipulator for photo compression (150x150px, 30% quality)
- **AsyncStorage**: Session persistence using @react-native-async-storage/async-storage

## Architecture

### Core Application Flow
App.js → AppNavigator → [SplashScreen → AgeVerificationScreen → MainMenuScreen]

The app uses a stack-based navigation where each screen replaces the previous one. The landscape orientation is enforced at the App.js level, overriding the portrait setting in app.json.

### State Management Architecture
Redux store with three main slices, configured with middleware for persistence (though persistence is not actually implemented):
- `gameSlice`: Game state and mechanics
- `playersSlice`: Player management and data  
- `connectionSlice`: Network connectivity status, Socket.IO connection state, and room data

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
    ├── MainMenuScreen (Game mode selection hub)
    ├── CreateGameScreen (Game mode carousel with swipe navigation)
    ├── LobbyConfigScreen (Game lobby settings and configuration)
    ├── PlayerRegistrationScreen (Player profile input with photo/emoji)
    ├── CreateLobbyScreen (Real-time multiplayer lobby with Socket.IO)
    └── JoinGameScreen (Room code input for joining existing games)
```

### Key Dependencies Architecture
- **React Navigation**: Stack navigator with gesture disabling and custom animations
- **Redux Toolkit**: State management with non-serializable action ignoring for persistence
- **Expo AV**: Audio playbook with complex configuration for cross-platform compatibility
- **Expo Haptics**: Feedback system with error handling for unsupported platforms
- **react-native-svg**: SVG support (installed but MainMenu uses PNG for megaphone icon)
- **Firebase**: Backend integration with Auth and Realtime Database (@react-native-firebase/*)
- **Connectivity Suite**: BLE Manager, WiFi P2P, Framer Motion for advanced animations
- **UI Components**: React Native Paper for material design elements, Vector Icons, Super Grid
- **Socket.IO Client**: Real-time communication with backend server for multiplayer functionality
- **Expo Screen Orientation**: Landscape orientation enforcement at app level
- **AsyncStorage**: Session persistence and reconnection data storage

## Important Technical Notes

### Animation System
- Use `Animated.Value` refs, never mix with static values in transform arrays  
- **Complex Animation Warning**: Avoid `Animated.sequence` and `Animated.parallel` in `useFocusEffect` as they cause `useInsertionEffect` warnings with React Navigation
- **Safe Pattern**: Use simple `Animated.timing` calls with `setTimeout` for staggered effects
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

### Touch Gesture Implementation
- **Custom Touch Handlers**: Use `onTouchStart`, `onTouchMove`, `onTouchEnd` instead of PanResponder for better React Navigation compatibility
- **Swipe Threshold**: 50px minimum movement for valid swipes, 20px for swipe detection
- **Click Prevention**: Track `isSwipeInProgress` state to prevent button clicks during swipe gestures
- **Reset Timing**: 300ms delay after successful swipe, 100ms for non-swipes to allow normal clicks

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

#### CreateGameScreen Architecture
- **Touch-Based Swipe System**: Custom touch handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) for horizontal swipe navigation
- **Swipe Conflict Prevention**: `isSwipeInProgress` state prevents accidental button clicks during swipe gestures
- **Simplified Animation System**: Single `fadeAnim` to avoid `useInsertionEffect` warnings with React Navigation
- **Carousel Implementation**: Single mode display with swipe navigation, bottom indicators show mode icons
- **AudioService Integration**: Singleton service manages background music state across screens

#### AudioService Singleton Pattern
Global audio management service that persists across screen navigation:
- **Background Music**: Auto-initialized on MainMenuScreen, continues playing across navigation
- **Volume Control**: 15% volume for background music, 80% for sound effects
- **Mute State**: Persisted singleton state accessible from all screens
- **Cleanup Pattern**: Each screen handles individual sound cleanup, service manages global music

#### Folder Structure Insights
The project uses a feature-based organization:
- **Services Layer**: Singleton services like `AudioService.js` for cross-screen functionality
- **Game Screens**: `src/screens/game/` contains game-specific screens (CreateGameScreen, LobbyConfigScreen, PlayerRegistrationScreen)
- **Redux Store**: Organized by domain - `gameSlice.js`, `playersSlice.js`, `connectionSlice.js`
- **Theme System**: Centralized styling in `src/styles/theme.js`
- **Component Architecture**: Common components in `src/components/common/`, specialized components organized by feature
- **Game Engine**: Separated game logic in `src/game/` with dynamics, engine, and modes subdirectories
- **Multi-Protocol Connectivity**: Separate service directories for Bluetooth, Firebase, and WiFi implementations

#### Advanced Screen Implementations

**PlayerRegistrationScreen Architecture**:
- **Complete Profile System**: Nickname input, photo capture/selection, emoji picker, gender/orientation selection
- **Image Processing Pipeline**: expo-image-manipulator integration for photo compression (150x150px, 30% quality)
- **Socket.IO Integration**: Direct room joining with complete player data transmission
- **Error Handling**: Validation for required fields, base64 image processing, network failures

**CreateLobbyScreen Architecture**:
- **Dual Mode Operation**: Host creation (isJoining=false) vs Player joining (isJoining=true) with conditional logic
- **Real-Time Synchronization**: roomSync events with multiple sync attempts to prevent desynchronization
- **Player List Management**: Dynamic player display with host crown, "Tú" indicator, avatar/emoji support
- **Socket Event Management**: Comprehensive event listener system with cleanup on navigation

**JoinGameScreen Integration**:
- **Room Code Validation**: 6-digit numeric code validation with real-time backend verification
- **Seamless Navigation**: Direct integration with PlayerRegistrationScreen for profile completion
- **Error States**: Clear feedback for invalid codes, full rooms, connection failures

## Multiplayer Implementation

### Current Working Multiplayer Flow
**Complete End-to-End Multiplayer Lobby System**:
1. **PlayerRegistrationScreen**: Players register with nickname, photo/emoji, gender, orientation
2. **Image Processing**: Photos compressed to 150x150px, 30% quality via expo-image-manipulator for Socket.IO transmission
3. **Host Creates Lobby**: CreateLobbyScreen creates backend room with complete player data (including emoji/photo)
4. **Player Joins Room**: Other players join via room code, all data synchronized in real-time
5. **CreateLobbyScreen Synchronization**: All devices show complete player list with photos, emojis, host crown, and "Tú" indicator

### Critical Multiplayer Architecture Decisions
- **SocketService Singleton**: Maintains connection state across navigation with 30s timeouts
- **Image Compression Pipeline**: Large base64 images caused disconnections - solved with expo-image-manipulator compression
- **Player Data Consistency**: Backend Player model stores complete profile (emoji, photo, gender, orientation) and transmits via toClientObject()
- **Room Synchronization**: Multiple sync attempts with roomSync events prevent lobby desynchronization
- **Host vs Player Logic**: CreateLobbyScreen handles both host creation (isJoining=false) and player joining (isJoining=true) with different initialization logic

### Backend Infrastructure

#### Socket.IO Server Architecture
The Node.js backend provides real-time multiplayer functionality:
- **Express Server**: RESTful API endpoints and static file serving (port 3001)
- **Socket.IO Integration**: Real-time bidirectional communication with 60s ping timeout
- **Room Management**: 6-digit room codes with automatic generation and validation
- **Player System**: UUID-based player identification with complete profile data and reconnection support
- **Rate Limiting**: Protection against connection abuse (100 requests/minute per IP) using rate-limiter-flexible
- **CORS Configuration**: Configured for development with wildcard origins
- **Connection State Recovery**: 2-minute disconnection tolerance with automatic reconnection

#### Backend Directory Structure
```
backend/
├── src/
│   ├── server.js              # Main Express + Socket.IO server
│   ├── socket/
│   │   ├── socketHandler.js   # Primary Socket.IO event handlers
│   │   └── gameEvents.js      # Game-specific event logic
│   ├── models/
│   │   ├── Room.js           # Room model with player management
│   │   └── Player.js         # Player model with UUID, complete profile data
│   ├── utils/
│   │   ├── roomManager.js    # In-memory room storage with NodeCache
│   │   └── codeGenerator.js  # 6-digit room code generation
│   └── routes/
│       └── api.js            # REST API endpoints for validation
├── test-api.js               # Comprehensive integration testing script
└── package.json              # Backend dependencies and scripts
```

#### Network Configuration for Mobile Development
- **Server Binding**: Backend listens on `'0.0.0.0'` for mobile device access
- **IP Configuration**: Frontend configured for local network IP (src/config/server.js)
- **WSL vs Windows**: Run backend from Windows CMD (not WSL) to avoid IP resolution issues
- **Metro Config**: React Native Metro bundler configured to ignore backend directory (metro.config.js:7-11)
- **Mobile Testing**: Successfully tested on physical Android devices over WiFi with manual IP configuration
- **IP Detection**: Use `ipconfig` (Windows) to find your local IP address for device testing

#### Socket.IO Service Integration
- **SocketService Singleton**: Manages connection state across app navigation (src/services/SocketService.js)
- **RoomService Wrapper**: High-level API for room operations (src/services/RoomService.js)
- **Session Persistence**: AsyncStorage integration for reconnection data with 30-minute expiration
- **Event Management**: Comprehensive event listener system with cleanup patterns
- **Error Handling**: Robust connection error handling with exponential backoff reconnection
- **Player Data Flow**: Complete profile transmission (nickname, emoji, photo, gender, orientation)

#### Backend Development Workflow
1. **Start Backend**: `cd backend && npm run dev` for development with auto-reload (run from Windows CMD, not WSL)
2. **Production Mode**: `cd backend && npm start` for production server
3. **Test Integration**: `cd backend && node test-api.js` validates all endpoints and Socket.IO events
4. **Health Check**: `curl http://localhost:3001/health` to verify server status
5. **Monitor Connections**: Backend logs show real-time connection events with player details
6. **Mobile Testing**: Update IP address in src/config/server.js for device testing (currently set to 192.168.100.18)
7. **Room Management**: 6-digit codes auto-expire after 2 hours of inactivity

#### Socket.IO Events Architecture
Key events for game functionality:
- **Room Events**: createRoom, joinRoom, leaveRoom, reconnectToRoom, syncRoom
- **Player Events**: playerJoined, playerLeft, playerDisconnected, playerReconnected
- **Game Events**: startGame, pauseGame, resumeGame, gameAction, syncGameState
- **Admin Events**: kickPlayer, getServerInfo, heartbeat ping/pong
- **Sync Events**: roomSync for real-time lobby updates with complete player data

## Important Development Notes

### Multiplayer Development Patterns
- **Image Compression Required**: Always use expo-image-manipulator for photos before Socket.IO transmission to prevent disconnections
- **Player Data Consistency**: Ensure all player data (emoji, photo, gender, orientation) flows from registration → backend → lobby synchronization
- **Room Synchronization**: Use multiple roomSync event calls with delays (immediate, 2s, 5s) for reliable lobby updates
- **Backend Location**: Run backend from Windows CMD, not WSL, to avoid IP resolution issues with mobile devices

### Metro Bundler Configuration
The project uses custom Metro configuration (metro.config.js) to prevent conflicts between frontend and backend:
- Backend directory and node_modules are explicitly blocked from Metro's file resolution
- Watch folders are restricted to src/, assets/, and frontend node_modules only
- This prevents React Native from trying to bundle backend dependencies

### Room Dissolution and Navigation Management

#### Advanced Modal System
The app implements a comprehensive modal system for room dissolution and error handling:
- **Host Dissolution Modal**: Custom post-it styled modal when host wants to dissolve room
- **Player Leave Modal**: Confirmation modal when non-host players want to leave
- **Kicked Notification Modal**: Automatic modal for players when host dissolves room
- **Error Modals**: Custom error modals with post-it design for room validation failures

#### Room Dissolution Flow
Complete implementation of room dissolution with proper player notification:
1. **Host Initiates**: Host presses back button → confirmation modal appears
2. **Backend Processing**: `leaveRoom` event detects host departure and emits `kicked` to remaining players
3. **Player Notification**: All players receive `kicked` event → custom modal appears automatically
4. **Navigation Management**: Players redirected to MainMenu, host goes to LobbyConfigScreen
5. **Resource Cleanup**: Room deleted from backend, event listeners cleaned up, sessions cleared

#### Advanced Navigation Patterns
- **Stack Reset Strategy**: Use `navigation.reset()` instead of `goBack()` to prevent "GO_BACK action not handled" errors
- **Parameter Safety**: Always provide default values for route parameters to handle missing navigation state
- **Modal Navigation**: Custom modal-based confirmation flows instead of basic Alert.alert()
- **Cross-Screen State**: Singleton services maintain state across navigation transitions

#### Room Validation System
Real-time room validation before joining:
- **Backend Validation**: `validateRoom` endpoint checks room existence and capacity before joining
- **Error Categorization**: Specific error types (ROOM_NOT_FOUND, ROOM_FULL) with custom messages
- **Frontend Validation**: Pre-validation of room codes with immediate feedback
- **Navigation Integration**: Seamless flow from validation → registration → lobby

### Critical Implementation Patterns

#### Event Listener Management
- **Registration Pattern**: All Socket.IO event listeners registered in useEffect with dependency arrays
- **Cleanup Pattern**: ALWAYS remove event listeners in useEffect cleanup functions
- **Event Names**: Consistent naming: `playerJoined`, `playerLeft`, `kicked`, `roomSync`
- **Handler Isolation**: Event handlers defined within useEffect scope to access current state

#### Modal Animation Patterns
- **Entrance Animation**: `Animated.spring()` for scale with `Animated.timing()` for opacity
- **Exit Animation**: `Animated.timing()` for both scale and opacity with faster duration (200ms)
- **Timing Coordination**: Use `setTimeout()` delays (300ms) after modal close before navigation
- **State Management**: Separate state variables for each modal type with individual animation refs

#### Socket.IO Event Architecture
Key events implemented in the system:
- **Room Events**: `createRoom`, `joinRoom`, `leaveRoom`, `validateRoom`, `syncRoom`
- **Player Events**: `playerJoined`, `playerLeft`, `playerDisconnected`, `playerReconnected`
- **Dissolution Events**: `kicked` (for automatic player expulsion when host leaves)
- **Sync Events**: `roomSync` for real-time lobby updates with complete player data

### Error Handling Patterns
- **Backend**: Comprehensive error handling with process-level uncaught exception and unhandled rejection handlers
- **Frontend**: Haptic feedback wrapped in try-catch for cross-platform compatibility
- **Audio Service**: All audio operations include error handling with fallback behavior
- **Socket.IO**: 30-second timeouts with exponential backoff reconnection
- **Image Processing**: Error handling for large base64 strings and compression failures
- **Navigation Errors**: Stack management to prevent navigation action failures
- **Modal Error Display**: Custom error modals instead of basic alerts for better UX

### Security Considerations
- CORS configured for development (wildcard origins) - should be restricted in production
- Rate limiting implemented on backend (100 requests/minute per IP) using rate-limiter-flexible
- Helmet middleware for basic security headers
- Process-level graceful shutdown handlers for clean server termination (SIGTERM)
- Process-level error handlers for uncaughtException and unhandledRejection
- Session expiration (30 minutes) for reconnection data in AsyncStorage
- Room validation prevents unauthorized access to non-existent or full rooms
- UUID-based player identification for secure player management
- Connection state recovery with 2-minute disconnection tolerance
- Socket.IO configuration with ping timeout (60s) and ping interval (25s)