# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PaDrinks is a React Native drinking game app built with Expo. It's designed for party multiplayer experiences with post-it note aesthetic and landscape orientation. The app supports multiple connectivity options (Bluetooth, WiFi P2P, Socket.IO) and features animated shot-pouring effects.

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

# Test backend with client simulator
# Open test-client.html in browser for Socket.IO testing
```

### Building APK for Android

```bash
# Build APK for testing (preview profile)
npm run build:android

# Note: package-lock.json is excluded from git repo
# EAS Build uses npm install instead of npm ci
# First build will ask to generate Android Keystore (say Yes)
```

### Windows Development Setup
```bash
# Windows-specific Expo commands (bypassing npx issues)
npm run start:windows          # Use .bat file wrapper
npm run start:windows:clear    # Use .bat file with cache clear

# Direct node execution (recommended for Windows)
npm start                      # Uses expo-start.js custom wrapper
```

### Tunnel Development (ngrok)
```bash
# Setup ngrok tunnel for backend (run from Windows CMD as Administrator)
npm install -g ngrok
ngrok config add-authtoken YOUR_NGROK_TOKEN
ngrok http 3001

# Update src/config/server.js with ngrok URL
# Then start Expo in tunnel mode
npm run start:tunnel
```

## Project Configuration

- **Expo SDK**: Version 54.0.0 with new architecture enabled
- **React Version**: React 19.1.0 with React Native 0.81.5
- **Expo CLI**: Version 0.25.x with custom Windows wrappers
- **Orientation**: app.json specifies "landscape" and App.js additionally enforces landscape mode at runtime via expo-screen-orientation
- **No Testing Setup**: No Jest, ESLint, or other testing/linting tools configured
- **No Build Scripts**: Uses EAS Build for APK generation
- **Connectivity Stack**: Socket.IO real-time communication for multiplayer (Firebase removed in SDK 54 update)
- **Backend Integration**: Node.js + Express + Socket.IO backend server for multiplayer functionality
- **Image Processing**: expo-image-manipulator for photo compression (150x150px, 30% quality)
- **AsyncStorage**: Session persistence using @react-native-async-storage/async-storage
- **QR Code System**: Complete QR generation and scanning for multiplayer room joining using react-native-qrcode-svg and expo-camera
- **Required Expo Packages**: expo-file-system and expo-asset are critical dependencies for SDK 54

## Architecture

### Core Application Flow
App.js → AppNavigator → [SplashScreen → AgeVerificationScreen → MainMenuScreen]

The app uses a stack-based navigation where each screen replaces the previous one. The landscape orientation is enforced at the App.js level, overriding the portrait setting in app.json.

### State Management Architecture
Redux store with three main slices, configured with middleware for persistence (though persistence is not actually implemented):
- `gameSlice`: Game state and mechanics (expanded for local gameplay with currentQuestion, gamePhase, questionsRemaining)
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
- **File Organization**: Audio files in `assets/sounds/` (PADRINKS.backround.music.mp3, beer.can.sound.mp3, wine-pop.mp3, school.bell.mp3, Roulette.Spin.mp3, bottle.spin.mp3)
- **Background Music**: Looping background music with volume control and mute functionality

### Design System Implementation
- **Theme File**: Centralized in `src/styles/theme.js` with post-it colors and Kalam fonts, now using responsive values from `src/utils/responsive.js`
- **Color Palette**: postItYellow (#FFE082), postItGreen (#C8E6C9), postItPink, postItBlue
- **Visual Style**: Notebook paper backgrounds with holes, red margin lines, and horizontal blue lines
- **Typography**: Handwritten feel using Kalam font family throughout
- **Responsive System**: Complete cross-device scaling system for phone-small, phone-large, and tablet devices using `scaleByContent()` function with device-specific multipliers

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
    ├── JoinGameScreen (Room code input for joining existing games)
    └── GameScreen (Local single-device gameplay)
```

### Local Game System Architecture

The project includes a complete local game engine for single-device gameplay:

#### Game Engine Components
- **GameEngine.js**: Main game controller managing rounds, state, and flow
  - 50-round base games with 25-round extensions
  - Game state persistence and recovery
  - Player management and validation
- **DynamicsManager.js**: Handles dynamic selection and question management
  - Random dynamic selection avoiding consecutive repeats
  - Question tracking to prevent repeats within same game
  - Dynamic deactivation when questions are exhausted

#### Game Data Structure
- **JSON-based Dynamics**: Stored in `src/data/dynamics/` with structured format
  - `whoIsMost.json`: Vote-based questions asking "Who is most likely to..."
  - `whoIsMoreLikely.json`: Comparative vote questions
  - `mentionChallenge.json`: Individual challenges requiring players to mention items from categories
  - `eliminationChallenge.json`: Elimination-style questions
  - `INeverNever.json`: "I never never" confession questions (50 questions)
  - `awkwardQuestions.json`: Awkward questions with player selection (20 questions)
  - `challengeOrShot.json`: Challenge or shot dynamics with optional gender restrictions (37 challenges)
  - `armWrestling.json`: Paired challenge for arm wrestling matches (paired_challenge type)
  - `rockPaperScissors.json`: Paired challenge for rock-paper-scissors without gender restriction
  - `whatDoYouPrefer.json`: Preference voting with two options
  - `headHeadSplash.json`: "Cabezas Splash" - paired challenge where players stare eye-to-eye with mouths full of drink, first to laugh/spit loses
  - `drinkingCompetition.json`: "Competencia de Fondo" - paired challenge where two players race to finish their drink, loser takes shot
  - `charadesDynamic.json`: "Charadas" - paired challenge with timer and phrase bank (21 phrases), players act out phrases with 60-second timer
  - `anonymousQuestions.json`: Anonymous voting on players (42 questions) - players pass phone to vote privately, most voted player takes shot
  - `prizeRoulette.json`: "Ruleta de Premios" - animated prize wheel (single-player paired_challenge) with 6 prizes, blocks after all players participate once
  - `spin.Bottle.json`: "Gira la Botella" - group dynamic with spinning bottle animation, appears maximum 3 times per game, confetti effect on stop
- **Question Schema**: Each question has `id`, `text`, `instruction`, `emoji`, and optionally `genderRestriction` and `targetGender`
- **Dynamic Types**:
  - `vote_selection`: Group voting dynamics (whoIsMost, whoIsMoreLikely, INeverNever)
  - `mention_challenge`: Individual player challenges with rotation system (mentionChallenge, awkwardQuestions, challengeOrShot)
  - `paired_challenge`: Two-player challenges with gender-based pairing (armWrestling, rockPaperScissors)
  - `preference_vote`: Multi-phase voting system where players vote individually on two options (whatDoYouPrefer)
  - `anonymous_vote`: Multi-phase anonymous voting where players vote for other players, most voted takes shot (anonymousQuestions)
- **Extensible Design**: Easy to add new dynamics by creating new JSON files and updating DynamicsManager

#### Game Flow Integration
**Single-Device Flow**: MainMenu → CreateGame → SingleDeviceSetup → MultiPlayerRegistration → CreateLobby → **"Iniciar Juego" button** → GameScreen
- **Host Controls**: Only lobby host can start games
- **Player Validation**: Minimum 2 players required to start
- **Seamless Transition**: Direct navigation from lobby to active gameplay

### Key Dependencies Architecture
- **React Navigation**: Stack navigator with gesture disabling and custom animations
- **Redux Toolkit**: State management with non-serializable action ignoring for persistence
- **Expo AV**: Audio playbook with complex configuration for cross-platform compatibility
- **Expo Haptics**: Feedback system with error handling for unsupported platforms
- **Expo File System**: Required for image processing and file operations (SDK 54)
- **Expo Asset**: Required for asset loading system (SDK 54)
- **Expo Navigation Bar**: Android-only navigation bar control for immersive mode (requires edgeToEdgeEnabled: false)
- **react-native-svg**: SVG support (installed but MainMenu uses PNG for megaphone icon)
- **Connectivity Suite**: BLE Manager, WiFi P2P, Framer Motion for advanced animations
- **UI Components**: React Native Paper for material design elements, Vector Icons, Super Grid
- **Socket.IO Client**: Real-time communication with backend server for multiplayer functionality
- **Expo Screen Orientation**: Landscape orientation enforcement at app level
- **AsyncStorage**: Session persistence and reconnection data storage

### QR Code Implementation

The app includes a complete QR code system for multiplayer room joining:

#### QR Generation (CreateLobbyScreen)
- **Conditional Display**: QR codes only appear when `playMethod === 'multiple'` (not for single device mode)
- **Integration**: Uses `react-native-qrcode-svg` to generate codes from 6-digit room codes
- **Responsive Sizing**: QR size scales with `scaleByContent(110, 'interactive')` for cross-device compatibility
- **Visual Integration**: QR replaces placeholder emoji/text within existing post-it styled container

#### QR Scanning (JoinGameScreen)
- **Camera Integration**: Uses `expo-camera` with `CameraView` for scanning (replaces deprecated expo-barcode-scanner)
- **Permission Management**: Automatically requests camera permissions via `Camera.requestCameraPermissionsAsync()`
- **Validation**: Only accepts 6-digit numeric codes matching game room format
- **Navigation Flow**: Successful scans navigate directly to `PlayerRegistration` with multiplayer parameters
- **UI Elements**: Custom scanner overlay with instructions, close button, and corner frame indicators

#### Technical Implementation Notes
- **Dependency Migration**: Project uses expo-camera instead of expo-barcode-scanner for SDK 54 compatibility
- **Barcode Settings**: Scanner configured specifically for QR codes: `barcodeScannerSettings={{ barcodeTypes: ["qr"] }}`
- **Error Handling**: Invalid codes show appropriate error messages via custom modals
- **Integration**: Both manual code entry and QR scanning lead to same registration flow

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

### Android Immersive Mode Implementation
Complete immersive experience with navigation bar hiding and back button blocking:

#### Navigation Bar Hiding
- **Package**: `expo-navigation-bar` for Android-only navigation bar control
- **Configuration**: `edgeToEdgeEnabled: false` in app.json to avoid API conflicts
- **Behavior**: `inset-swipe` mode allows temporary reappearance on swipe
- **Visibility**: Set to `hidden` with automatic re-application every 500ms
- **Transparency**: Background color `#00000001` (nearly transparent) when visible
- **Button Style**: `light` style for minimal visibility

#### Implementation in App.js
```javascript
const configureNavigationBar = async () => {
  await NavigationBar.setBehaviorAsync('inset-swipe');
  await NavigationBar.setBackgroundColorAsync('#00000001');
  await NavigationBar.setButtonStyleAsync('light');
  await NavigationBar.setVisibilityAsync('hidden');
};

// Re-apply every 500ms to maintain hidden state
const intervalId = setInterval(() => {
  NavigationBar.setVisibilityAsync('hidden').catch(() => {});
}, 500);
```

#### Back Button Blocking (Multi-Layer Approach)
Complete blocking of Android back button across all screens:

1. **App.js Level**: Global BackHandler with duplicate registration for redundancy
2. **AppNavigator Level**: BackHandler in NavigationContainer's useEffect
3. **onStateChange Handler**: Re-registration after each navigation change
4. **Screen Options**: `gestureEnabled: false` and `headerLeft: () => null` on all screens

#### Critical Implementation Pattern
```javascript
// AppNavigator.js - Multiple blocking layers
useEffect(() => {
  const backHandler = BackHandler.addEventListener(
    'hardwareBackPress',
    () => {
      console.log('🚫 Botón atrás bloqueado');
      return true; // Block completely
    }
  );
  return () => backHandler.remove();
}, []);

// Also in onStateChange
<NavigationContainer
  onStateChange={() => {
    BackHandler.addEventListener('hardwareBackPress', () => true);
  }}
>
```

#### Why Multi-Layer Blocking is Required
- React Navigation can override BackHandler on navigation changes
- Single-layer blocking may not survive screen transitions
- Duplicate handlers provide failsafe redundancy
- onStateChange ensures blocking persists after navigation

#### Important Notes
- Users can only navigate using in-app buttons (navigation.navigate/reset)
- To exit app, users must use Home button or task manager
- Navigation bar reappears briefly on swipe but auto-hides in 0.5 seconds
- All app navigation buttons continue working normally

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
- **Game Screens**: `src/screens/game/` contains game-specific screens (CreateGameScreen, LobbyConfigScreen, PlayerRegistrationScreen, GameScreen)
- **Redux Store**: Organized by domain - `gameSlice.js`, `playersSlice.js`, `connectionSlice.js`
- **Theme System**: Centralized styling in `src/styles/theme.js`
- **Component Architecture**: Common components in `src/components/common/`, specialized components organized by feature
- **Game Engine**: Local game engine in `src/game/` with `GameEngine.js` and `DynamicsManager.js`
- **Game Data**: Dynamics and questions stored as JSON in `src/data/dynamics/`
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
- **Responsive Player Items**: `playerItemFixedSafe` style with fixed height for single device mode to maintain consistent box sizing
- **Absolute Positioned Kick Button**: Kick button uses absolute positioning to float over player items without affecting layout

**JoinGameScreen Integration**:
- **Room Code Validation**: 6-digit numeric code validation with real-time backend verification
- **Seamless Navigation**: Direct integration with PlayerRegistrationScreen for profile completion
- **Error States**: Clear feedback for invalid codes, full rooms, connection failures

**GameScreen Architecture (Local Gameplay)**:
- **GameEngine Integration**: Direct integration with singleton GameEngine instance
- **Dynamic Question Display**: Shows instruction + question + action with responsive text sizing
- **Dual Control Buttons**: "Continuar" (continue) and "Pasar Dinámica" (skip) with post-it styling
- **In-Game Configuration**: Modal system for adding/removing players mid-game without losing progress
- **Round Management**: 50-round base with extension system, automatic game completion detection
- **Responsive Layout**: Question text auto-scales for long questions, maintains aesthetic consistency
- **Game State Persistence**: Modal automatically pauses game when opened, proper state recovery when closed
- **Player Management**: Add/remove players mid-game with automatic validation and game engine synchronization
- **Real-Time Player Control**: GameConfigModal with scrolleable player list, host exclusion, and limits validation (3-16 players)
- **State Synchronization**: Complex navigation parameter passing to preserve player data across MultiPlayerRegistration flows
- **Mention Challenge Integration**: Automatic player selection with underlined names, rotation system, and formatted display (player name at top, emoji in middle, instruction at bottom)
- **Paired Challenge Integration**: Gender-based automatic pairing with template-based rendering showing both player names underlined
- **Clean State Management**: clearAllPlayers() and resetGame() called on game termination to prevent data carryover

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
6. **Mobile Testing**: Update IP address in src/config/server.js for device testing
7. **Room Management**: 6-digit codes auto-expire after 2 hours of inactivity

### Server Configuration Management
The project uses a sophisticated server configuration system in `src/config/server.js` with priority-based URL resolution:
- **Tunnel Mode**: ngrok tunnels for external testing (highest priority)
- **Manual Configuration**: Local network IP for device testing (middle priority)
- **Auto-Detection**: Platform-specific localhost detection (lowest priority)
- Current configurations support Android emulator (10.0.2.2:3001), iOS simulator (localhost:3001), and real devices

#### Socket.IO Events Architecture
Key events for game functionality:
- **Room Events**: createRoom, joinRoom, leaveRoom, reconnectToRoom, syncRoom
- **Player Events**: playerJoined, playerLeft, playerDisconnected, playerReconnected
- **Game Events**: startGame, pauseGame, resumeGame, gameAction, syncGameState
- **Admin Events**: kickPlayer, getServerInfo, heartbeat ping/pong
- **Sync Events**: roomSync for real-time lobby updates with complete player data

### Responsive Design System Implementation

The project uses an advanced responsive system in `src/utils/responsive.js`:
- **Device Detection**: Automatic detection of phone-small, phone-large, and tablet categories
- **Content-Aware Scaling**: `scaleByContent(size, contentType)` function with different scaling for 'text', 'icon', 'interactive', and 'spacing' content types
- **Device-Specific Multipliers**: Custom multipliers for different screen sizes (e.g., Pixel 8 Pro gets 1.35x scaling)
- **Implementation Pattern**: Use `isSmallScreen`, `isTabletScreen` constants for conditional styling and `scaleByContent()` for all dimensions
- **Screen Layout Adaptation**: Automatic line count adjustment for notebook paper backgrounds based on screen size

#### MultiPlayerRegistrationScreen Responsive Patterns
- **Conditional Flex Values**: Different flex ratios for small screens vs tablets (e.g., `flex: isSmallScreen ? 0.4 : 0.35`)
- **Device-Specific Positioning**: Back button, mute button, and modal positioning adjusted per device type
- **Scalable UI Elements**: All padding, margins, font sizes, and component dimensions use `scaleByContent()`
- **Adaptive Layouts**: Photo containers, input fields, and button grids scale appropriately for different screen densities

## Important Development Notes

### Multiplayer Development Patterns
- **Image Compression Required**: Always use expo-image-manipulator for photos before Socket.IO transmission to prevent disconnections
- **Player Data Consistency**: Ensure all player data (emoji, photo, gender, orientation) flows from registration → backend → lobby synchronization
- **Room Synchronization**: Use multiple roomSync event calls with delays (immediate, 2s, 5s) for reliable lobby updates
- **Backend Location**: Run backend from Windows CMD, not WSL, to avoid IP resolution issues with mobile devices

### Local Game Development Patterns
- **GameEngine Singleton**: Use `getGameEngine()` to access the singleton instance, never create new instances
- **Dynamic JSON Structure**: Each dynamic requires `id`, `name`, `type`, `instruction`, `minPlayers`, and `questions` array
- **Question Management**: DynamicsManager automatically handles question deduplication and dynamic rotation
- **State Synchronization**: Always sync GameEngine state with Redux using appropriate action creators
- **Modal Integration**: GameConfigModal pauses game automatically; ensure proper cleanup when closing
- **Mid-Game Configuration**: Players can be added/removed during active gameplay without losing progress or current question state
- **State Validation**: Always validate player counts against game requirements when modifying player list during gameplay
- **ID Type Consistency**: Use `String(p.id) !== String(playerId)` for player comparisons due to mixed number/string ID types (original vs dynamic players)
- **Navigation Parameter Preservation**: Always pass `registeredPlayers` in navigation params to prevent state loss when returning from MultiPlayerRegistration

### Mention Challenge Anti-Repetition System
- **Redux State Management**: `mentionChallengeTracking` object in gameSlice with per-dynamic tracking (keyed by dynamicId)
- **Independent Tracking**: Each mention_challenge dynamic maintains its own rotation state (lastPlayer, usedPlayerIds)
- **Rotation Logic**: Players must participate once before anyone can repeat; when cycle resets, avoids immediate repetition of last player
- **Player Addition Handling**: When new players are added mid-game, rotation state is preserved (not reset) so new players are automatically available
- **State Persistence**: Anti-repetition state persists between questions even when other dynamics appear in between
- **Multiple Dynamics**: awkwardQuestions, mentionChallenge, and challengeOrShot track separately - player can appear in multiple dynamics without conflict
- **Gender Restriction System**: Optional `genderRestriction` field in questions filters eligible players
  - Supported values: `"male"`, `"female"` (matches player.gender field)
  - Auto-skip behavior: If no players match the gender requirement, question is automatically skipped
  - Rotation respects restriction: Only selects from eligible gender throughout rotation cycle
  - Example: `challengeOrShot.json` reto #14 ("Píntate los labios") has `genderRestriction: "male"`

### Paired Challenge System (ARM WRESTLING, ROCK PAPER SCISSORS, HEAD-TO-HEAD, CHARADES, DRINKING COMPETITION, SPIN BOTTLE)
- **Multiple Dynamic Types**:
  - `arm_wrestling`: Gender-based pairing (same gender required for fair matches)
  - `rock_paper_scissors`: No gender restriction (any player can play against any other)
  - `head_head_splash`: "Cabezas Splash" - players hold drink in mouth, first to laugh/spit loses
  - `drinking_competition`: "Competencia de Fondo" - race to finish drink, loser takes shot
  - `charades_dynamic`: Interactive charades with timer and phrase bank (special component)
  - `spin_bottle`: Group dynamic with spinning bottle, excluded from auto-blocking (appears max 3 times)
- **Anti-Repetition Tracking**: Uses `pairedChallengeTracking` object in Redux with per-dynamic tracking (keyed by dynamicId)
- **Smart Selection Algorithm**:
  - PASO 1: Find gender with 2+ non-participants (for arm_wrestling)
  - PASO 2: Select 1 non-participant, pair with same gender player
  - PASO 3: Determine if dynamic should block when all eligible players participated
- **Auto-Skip Logic**: Skips dynamic when no matching pair available (e.g., only one male player)
- **Automatic Blocking**: When all eligible players participate, dynamic is blocked using `skippedPairedDynamicIds` Set
- **Automatic Unblocking**: When new players are added mid-game, all blocked paired_challenge dynamics are automatically unblocked
- **Question Reusability**: paired_challenge questions NOT marked as used (can appear with different player pairs)
- **Processing Prevention**: Uses `lastProcessedQuestionId` ref to prevent infinite loops when auto-skipping blocked dynamics
- **Player Management**: Automatically removes player IDs from tracking when players are kicked mid-game
- **State Isolation**: Tracking persists during game but resets completely between games

### Anonymous Vote System (PREGUNTAS ANÓNIMAS)
Complete anonymous voting system where players privately vote for other players:

#### System Architecture
- **Type**: `anonymous_vote` - Multi-phase voting system with phone passing
- **Component**: `AnonymousVoteDisplay.js` - Handles all voting phases and UI
- **Redux State**: `anonymousVoteState` in gameSlice with phase tracking and vote collection
- **Minimum Players**: 3 players required
- **Question Pool**: 42 questions in `anonymousQuestions.json`

#### Voting Flow (5 Phases)
1. **passing_phone Phase**: "Pasa el celular a [Player Name]" screen with Continue button
2. **voting Phase**: Player sees question and buttons with all eligible player names to vote
3. **Loop**: Phases 1-2 repeat for each player in the game
4. **returning_phone Phase**: "Pasa el celular a la persona que está leyendo las dinámicas" screen
5. **results Phase**: Shows vote counts for each player (anonymous - doesn't show who voted for whom)
6. **penalty Phase**: Displays most voted player(s) who must take shot

#### Gender Restriction System
Two independent gender filters implemented:
- **genderRestriction**: Limits who can VOTE (filters `eligiblePlayers`)
  - Example: Only male players can vote on a specific question
- **targetGender**: Limits voting OPTIONS (filters `targetPlayers` displayed as buttons)
  - Example: All players vote, but only male players appear as button options
  - Values: `"male"`, `"female"`, or undefined (all players)

#### UI Implementation Details
- **Responsive Button Grid**: Automatically adjusts columns based on player count
  - 2-4 players: 2 columns
  - 5-9 players: 3 columns
  - 10+ players: 4 columns
- **Compact Button Sizing**: Smaller buttons to accommodate up to 16 players
- **ScrollView Integration**: Both voting screen and results screen scroll for many players
- **Button States**: Yellow (default), Green (selected), with post-it styling and rotation effects

#### Vote Counting and Results
- **Anonymous Tracking**: Stores `voterId` and `votedForId` but doesn't display who voted for whom
- **Results Display**: Shows each player with vote count in descending order
- **Tie Handling**: If multiple players tied for most votes, ALL tied players take shot
- **Zero Votes**: If no votes cast, displays "¡No hubo votos!" and nobody takes shot

#### Redux Actions
- `initializeAnonymousVote`: Sets up voting with eligible voters and target players
- `setAnonymousVotePhase`: Transitions between phases (passing_phone, voting, returning_phone, results, penalty)
- `recordAnonymousVote`: Stores individual vote with voter and target player IDs
- `nextAnonymousVotePlayer`: Increments player index after vote
- `skipAnonymousVotePlayer`: Skips current player's turn
- `resetAnonymousVoteState`: Clears all state after dynamic completion

#### Question Reusability
- Like `preference_vote`, `anonymous_vote` questions are NOT marked as used
- Questions can reappear later in the same game with different voting outcomes
- DynamicsManager line 82 excludes `anonymous_vote` from auto-marking

#### Integration Pattern
```javascript
// GameScreen.js integration (lines 1038-1044)
{currentQuestion?.dynamicType === 'anonymous_vote' ? (
  <AnonymousVoteDisplay
    question={currentQuestion}
    allGamePlayers={allGamePlayers}
    onComplete={handleContinue}
    onSkipDynamic={handleSkipDynamic}
  />
) : (
  // Other dynamic types...
)}
```

### Charades System (CHARADAS)
Complete interactive charades game with timer and random phrase selection:

#### System Architecture
- **Type**: `paired_challenge` - Two-player acting game with special UI component
- **Dynamic ID**: `charades_dynamic` - Detected by dynamicId instead of dynamicType
- **Component**: `CharadesDisplay.js` - Self-contained component with timer and modals
- **Question Pool**: 1 question with 21 different phrases to act out
- **Timer Duration**: 60 seconds (1 minute)

#### Game Flow
1. **Initial State**: "Mostrar Frase" button enabled, "Empezar Timer" button disabled
2. **Show Phrase**: Player presses "Mostrar Frase" → random phrase shown in modal → button becomes disabled
3. **Start Timer**: "Empezar Timer" button becomes enabled after phrase shown → starts 60-second countdown
4. **Timer Display**: Button text changes to show remaining time in MM:SS format (e.g., "1:00", "0:45")
5. **Timer End**: School bell sound plays, modal appears with "Se acabó el tiempo" message
6. **Continue/Skip**: Standard buttons available throughout to advance or skip the dynamic

#### UI Components
- **Two Special Buttons**: "Mostrar Frase" and "Empezar Timer" positioned horizontally
- **Button Logic**: Timer only activates after phrase has been shown (prevents cheating)
- **Modals**: Notebook paper design matching game aesthetic
  - Phrase modal: Shows selected phrase with "Tu frase es:" title
  - Time up modal: Shows ⏰ emoji with "Se acabó el tiempo" message
- **Layout Matching**: Uses Fragment return with same structure as other dynamics (instructionContainer, questionContainer with maxHeight, buttonsContainer)

#### Technical Implementation
- **Phrase Selection**: Random selection from 21 phrases stored in question.phrases array
- **Timer Management**: useRef for interval, useState for timeRemaining countdown
- **Modal Animations**: Scale and opacity animations using Animated.spring and Animated.timing
- **Audio Integration**:
  - "wine-pop.mp3" when showing phrase
  - "school.bell.mp3" when timer ends (80% volume)
  - "beer.can.sound.mp3" when starting timer
- **Responsive Design**: Includes isSmallScreen detection for proper maxHeight constraint

#### Critical Layout Pattern
CharadesDisplay must maintain exact same positioning as other dynamics:
- **questionContainer maxHeight**: Must have `maxHeight: isSmallScreen ? 300 : 400` to prevent flex: 1 from expanding too much
- **Fragment Return**: Returns `<>...</>` not a wrapping View to integrate properly with GameScreen's content View
- **Three Main Sections**: instructionContainer → questionContainer (flex: 1) → buttonsContainer
- Without maxHeight, the instruction appears too low and buttons misaligned due to excessive questionContainer expansion

#### Question Reusability
- Like other `paired_challenge` types, questions are NOT marked as used in DynamicsManager
- Same question can appear multiple times with different player pairs
- Each appearance randomly selects a new phrase from the 21-phrase bank

#### Integration Pattern
```javascript
// GameScreen.js integration
{currentQuestion?.dynamicId === 'charades_dynamic' ? (
  <CharadesDisplay
    question={currentQuestion}
    player1Name={selectedPairedPlayers.player1?.name || 'Jugador 1'}
    player2Name={selectedPairedPlayers.player2?.name || 'Jugador 2'}
    onComplete={handleContinue}
    onSkipDynamic={handleSkipDynamic}
  />
) : (
  // Other dynamic types...
)}
```

### Prize Roulette System (RULETA DE PREMIOS)
Animated prize wheel with single-player rotation and automatic blocking:

#### System Architecture
- **Type**: `paired_challenge` - Single-player game (only uses player1, player2 set to null)
- **Dynamic ID**: `prize_roulette` - Detected by dynamicId for special handling
- **Component**: `PrizeRouletteDisplay.js` - Self-contained animated roulette component
- **Question Pool**: 1 question with 6 different prizes
- **Blocking Behavior**: Automatically blocks after all players participate once (like armWrestling)

#### Game Flow
1. **Initial State**: Player name displayed, "Girar" button enabled
2. **Spin Animation**: 5-second rotation with Roulette.Spin.mp3 audio
3. **Prize Selection**: Random prize selected from 6 options
4. **Confetti Effect**: 50 particles fall from top of screen
5. **Prize Modal**: Displays winning prize in notebook paper modal
6. **Continue/Skip**: Standard buttons available throughout

#### Prize Options (6 total)
- "Reparte shot a todos"
- "Negar 3 shots"
- "Desviar shot"
- "Reparte shot a un jugador"
- "Multiplica el shot de alguien"
- "Negar 1 shot"

#### Technical Implementation
- **SVG Roulette**: 200x200 viewBox with 6 wedge paths using post-it colors
- **Text Rendering**: Multi-line text support with automatic word wrapping (max 15 chars per line)
- **Text Position**: Positioned at 68% radius, rotated radially (pointing inward)
- **Rotation Animation**: Animated.View wrapping SVG, interpolates 0-360 degrees over 5 seconds
- **Confetti System**: 50 particles with individual Animated.Value instances, random colors and positions
- **Modal Design**: Transparent background, 8 horizontal lines, notebook paper aesthetic
- **Audio Integration**:
  - "Roulette.Spin.mp3" when button pressed (80% volume)
  - "school.bell.mp3" when spin completes (80% volume)

#### Single-Player Paired Challenge Pattern
Unlike other paired_challenge dynamics, prizeRoulette only tracks ONE player:
```javascript
// GameScreen.js special handling
if (dynamicId === 'prize_roulette') {
  dispatch(addPairedChallengeParticipants({
    dynamicId,
    player1Id: player1.id,
    player2Id: null  // Only one player participates
  }));
}
```

#### Redux Integration
- **gameSlice.js**: `addPairedChallengeParticipants` checks `if (player2Id && ...)` before adding
- Prevents adding null to pairedChallengeTracking array
- Tracks only player1, ensuring correct blocking behavior

#### Question Reusability
- Questions NOT marked as used in DynamicsManager (can appear with different players)
- Dynamic blocks after ALL players spin once
- Auto-unblocks when new players added mid-game

#### Integration Pattern
```javascript
// GameScreen.js integration
{currentQuestion?.dynamicId === 'prize_roulette' ? (
  <PrizeRouletteDisplay
    question={currentQuestion}
    player1Name={selectedPairedPlayers.player1?.name || 'Jugador 1'}
    onComplete={handleContinue}
    onSkipDynamic={handleSkipDynamic}
  />
) : (
  // Other dynamic types...
)}
```

### Spin Bottle System (GIRA LA BOTELLA)
Group dynamic with spinning bottle animation and appearance limit:

#### System Architecture
- **Type**: `paired_challenge` - But excluded from player selection logic (group dynamic)
- **Dynamic ID**: `spin_bottle` - Detected for special handling in GameScreen
- **Component**: `SpinBottleDisplay.js` - Self-contained spinning bottle component
- **Question Pool**: 1 question (group dynamic, no player-specific content)
- **Appearance Limit**: Maximum 3 times per game (managed by GameEngine)

#### Game Flow
1. **Initial State**: Bottle displayed with "Girar" button centered on top
2. **Spin Animation**: 5-second rotation (1800° + random degrees) with bottle.spin.mp3 audio
3. **Confetti Effect**: 50 particles fall from top of screen when bottle stops
4. **Bell Sound**: school.bell.mp3 plays when rotation completes
5. **Manual Selection**: Players manually determine who the bottle points to (no automatic selection)
6. **Continue/Skip**: Standard buttons available throughout

#### Technical Implementation
- **Image**: Uses Bottle.Spin.png (220x220px) instead of SVG for bottle rendering
- **Button Behavior**: "Girar" button (55x55px) disappears during spin, reappears after
- **Rotation Animation**: Animated.Value with Easing.out(Easing.cubic) for gradual deceleration
- **Confetti System**:
  - 50 particles starting at `top: -300` (above screen)
  - Animation range: `translateY: [0, 900]`
  - `confettiAnimValues` array cleared on each spin to prevent position issues
  - Post-it colors (yellow, green, pink, blue)
- **Audio Integration**:
  - bottle.spin.mp3 during rotation (80% volume)
  - school.bell.mp3 when stopped (80% volume)

#### Appearance Limit System
- **GameEngine Tracking**: `dynamicAppearanceCount` object tracks appearances by dynamicId
- **Block Logic**: When count reaches 3, dynamicId added to `blockedDynamicIds` Set
- **DynamicsManager Integration**: `getNextQuestion(blockedDynamicIds)` filters blocked dynamics
- **Counter Increment**: Only increments AFTER all validations pass (not on rejected questions)
- **Reset**: Counter resets to `{}` when new game starts

#### Exclusion from Paired Challenge Auto-Blocking
Critical difference from other paired_challenge dynamics:
```javascript
// GameScreen.js - spin_bottle excluded from player selection logic
if (dynamicId === 'spin_bottle') {
  console.log(`🍾 Spin Bottle - dinámica grupal, sin selección de jugadores ni auto-bloqueo`);
  return;
}
```
- Does NOT select player pairs
- Does NOT track participants
- Does NOT auto-block when all players participate
- ONLY blocks after 3 total appearances (via GameEngine counter)

#### Integration Pattern
```javascript
// GameScreen.js integration
{currentQuestion?.dynamicId === 'spin_bottle' ? (
  <SpinBottleDisplay
    question={currentQuestion}
    onComplete={handleContinue}
    onSkipDynamic={handleSkipDynamic}
  />
) : (
  // Other dynamic types...
)}
```

### GameScreen Lifecycle and State Cleanup System

Critical patterns for managing GameScreen lifecycle to prevent state pollution between games:

#### Component Mount State Tracking
- **isMountedRef Pattern**: Use `useRef(true)` to track component mount state, set to `false` in cleanup
- **useEffect Guards**: All useEffect hooks check `isMountedRef.current` before executing to prevent execution in unmounted components
- **Prevents Race Conditions**: Guards prevent "Can't perform a React state update on an unmounted component" warnings

#### State Cleanup Order (Critical)
The cleanup order is critical to prevent race conditions and data leaks:
1. **currentQuestion First**: Clear with `dispatch(setCurrentQuestion(null))` to stop useEffect processing
2. **Local State**: Clear all component state (`setAllGamePlayers([])`, `setSelectedPlayerForQuestion(null)`, etc.)
3. **Refs**: Clear all ref-based tracking (`skippedPairedDynamicIds.current.clear()`, `lastProcessedQuestionId.current = null`)
4. **GameEngine**: Reset singleton with `gameEngine.resetGame()`
5. **Redux Last**: Clear Redux state with `dispatch(clearAllPlayers())` and `dispatch(resetGame())`

#### Navigation Stack Management
- **navigation.reset() Required**: Must use `navigation.reset()` instead of `navigate()` to properly dismount GameScreen
- **Stack Reset Pattern**: `navigation.reset({ index: 0, routes: [{ name: 'MainMenu' }] })` forces complete component dismount
- **Problem with navigate()**: Using `navigate('MainMenu')` only hides GameScreen without dismounting it, leaving useEffect hooks active

#### Complete Cleanup Locations
Both game-ending paths must implement identical cleanup:
1. **GameScreen.handleEndGame()**: Direct "Terminar Juego" button after game completion
2. **GameConfigModal.handleEndGame()**: Config button → "Terminar Juego" → confirmation → "Terminar"

#### Multiple Instance Prevention
- Without proper cleanup and navigation.reset(), multiple GameScreen instances can run simultaneously in the navigation stack
- Each instance processes questions independently, causing mixed player data from different games
- Proper dismounting ensures only one GameScreen instance exists at a time

### Metro Bundler Configuration
The project uses custom Metro configuration (metro.config.js) to prevent conflicts between frontend and backend:
- Backend directory and node_modules are explicitly blocked from Metro's file resolution
- Watch folders are restricted to src/, assets/, and frontend node_modules only
- This prevents React Native from trying to bundle backend dependencies
- **Windows-Specific**: Blocks `.bin` directories to prevent EACCES permission errors on Windows
- **Windows File Watcher**: Disables problematic file watchers on win32 platform

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

### Player Validation and Management System

#### Registration Validation System
Complete field validation implemented across all registration screens:
- **Required Fields**: Nickname (min 2 chars), gender, orientation, avatar (photo or emoji)
- **Duplicate Name Prevention**: Real-time checking against existing players in both local and online modes
- **Custom Error Modals**: Post-it notebook design matching game aesthetics instead of basic alerts
- **Online Mode Validation**: Uses `getRoomInfo` backend endpoint to check room status without requiring membership
- **Local Mode Validation**: Validates against `registeredPlayers` array in Redux store

#### Player Kick/Expulsion System
Comprehensive player management with custom modals and real-time synchronization:
- **Host-Only Controls**: Only room host can initiate player expulsion
- **Custom Kick Modal**: Post-it notebook design with confirmation workflow matching game aesthetics
- **Backend Processing**: Single event handler in `socketHandler.js` (duplicate removed from `gameEvents.js`)
- **Real-Time Notification**: Expelled players receive `kicked` event with custom modal display
- **Automatic Sync Cancellation**: Cancels pending automatic room synchronization calls to prevent conflicts
- **Cross-Device Updates**: Host sees immediate player removal, expelled player gets notification modal
- **Navigation Management**: Proper redirection after expulsion with stack reset patterns

#### UI Layout Patterns for CreateLobbyScreen
Critical patterns for maintaining consistent player item layouts:
- **Single Device Mode**: Apply `playerItemFixedSafe` style with exact height (`height: scaleByContent(56, 'interactive')`) to prevent variable box heights
- **Multiple Device Mode**: Use default `playerItem` styling with natural flex behavior
- **Kick Button Positioning**: Use absolute positioning (`position: 'absolute'`, `right`, `top: '50%'`) to float kick buttons over player items without affecting container layout
- **Empty Slots Management**: In single device mode, set `maxSlots = connectedPlayers.length` to eliminate empty slots that cause layout distribution issues

#### Backend Event Architecture for Player Management
- **validateRoom**: Pre-join room validation without membership requirement
- **getRoomInfo**: Complete room information including player list for validation
- **kickPlayer**: Host-initiated player expulsion with proper event cascading
- **kicked**: Individual player notification event for expulsion
- **playerLeft**: General notification to other players about departures

### Critical Implementation Patterns

#### Event Listener Management
- **Registration Pattern**: All Socket.IO event listeners registered in useEffect with dependency arrays
- **Cleanup Pattern**: ALWAYS remove event listeners in useEffect cleanup functions
- **Event Names**: Consistent naming: `playerJoined`, `playerLeft`, `kicked`, `roomSync`
- **Handler Isolation**: Event handlers defined within useEffect scope to access current state

#### Timeout and Synchronization Management
- **Automatic Sync Timeouts**: Store timeout references using `useRef` for cancellation during cleanup
- **Sync Cancellation Pattern**: Cancel automatic room synchronization timeouts after player expulsion to prevent errors
- **Memory Leak Prevention**: Always clear timeouts in component unmount and after critical operations
- **Conflict Resolution**: Prevent multiple simultaneous sync operations that can cause "Player not found" errors

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

## Windows Development Issues and Solutions

### Windows/WSL Compatibility Issues
- **npx Problems**: `npx expo` fails in Git Bash/WSL - use direct node execution instead
- **Permission Errors**: EACCES errors with node_modules/.bin resolved by custom expo-start.js wrapper
- **Symlink Issues**: Windows symlinks in node_modules cause Metro crashes - blocked in metro.config.js
- **Path Resolution**: Use forward slashes in scripts, but direct node execution for cross-platform compatibility

### Windows-Specific Files Created
- `expo-start.js`: Custom Node.js wrapper to bypass npx issues on Windows
- `start-expo.bat` & `start-expo-clear.bat`: Windows batch alternatives for direct execution
- Modified `metro.config.js`: Windows-specific .bin directory blocking and file watcher configuration

### Tunnel Configuration (ngrok Integration)
- **Server Configuration**: `src/config/server.js` includes priority system: tunnel > manual > auto-detection
- **ngrok Setup**: Requires authentication token and installation via Windows CMD as Administrator
- **URL Management**: `TUNNEL_SERVER_URL` variable enables/disables tunnel mode
- **Mobile Testing**: Tunnel allows app testing from any network, bypassing local IP limitations

### Development Environment Recommendations
- **Backend**: Run from Windows CMD (not WSL) to avoid IP resolution issues with mobile devices
- **Frontend**: Can run from WSL/Git Bash using custom scripts, or Windows CMD for full compatibility
- **ngrok**: Must be installed and run from Windows CMD with Administrator privileges
- **Metro Cache**: Cache corruption common after installations - automatic fallback to full crawl is normal
- **IP Configuration**: For mobile device testing, update IP in src/config/server.js to your machine's local network IP (use `ipconfig` to find it)

## EAS Build Configuration

### APK Build System
- **package-lock.json Exclusion**: The `package-lock.json` file is intentionally excluded from the git repository
- **Build Strategy**: EAS uses `npm install` instead of `npm ci` to avoid synchronization issues
- **Pre-Install Hook**: `.eas/build/eas-build-pre-install.sh` removes package-lock.json before dependency installation
- **Build Profile**: Uses "preview" profile for generating APK files for testing

### Build Workflow
1. **Credential Management**: EAS automatically generates and stores Android Keystore on first build
2. **Remote Builds**: All builds run on Expo's cloud infrastructure
3. **QR Code Distribution**: Successful builds provide QR codes for easy APK download
4. **Build Logs**: Complete build logs available on expo.dev for debugging

### Important Build Notes
- Never commit `package-lock.json` to git repo
- Run `npm install` locally before building to sync dependencies
- Builds take ~10-15 minutes on EAS servers
- First build requires creating Android Keystore (accept automatic generation)
- APK files can be installed directly on Android devices for testing

## MCP (Model Context Protocol) Integration

The project includes MCP server integrations for enhanced AI/LLM capabilities:

### MCP Configuration
- **Configuration File**: `.claude/claude_desktop_config.json` defines available MCP servers
- **Metro Bundler Exclusion**: `metro.config.js` explicitly blocks `mcp-servers/` directory to prevent Metro conflicts
- **Reference Servers**: Local implementations of filesystem, memory, everything, and sequential-thinking servers
- **External Integrations**: Figma and Puppeteer MCP servers via npm packages

### Available MCP Servers
- **Filesystem**: Secure file operations with configurable access controls
- **Memory**: Knowledge graph-based persistent memory system
- **Everything**: Reference server with prompts, resources, and tools
- **Sequential Thinking**: Dynamic problem-solving through thought sequences
- **Figma**: Design tool integration via Composio
- **Puppeteer**: Browser automation capabilities

### MCP Development Notes
- **Server Location**: MCP servers located in `mcp-servers/` directory (excluded from React Native bundle)
- **Built Servers**: MCP servers reference compiled JavaScript files in `dist/` directories
- **Environment Variables**: MCP servers can be configured with environment variables in the configuration
- **Metro Exclusion**: Critical to keep MCP servers blocked in Metro config to prevent bundling conflicts

## Development Quality Standards

### Code Quality Requirements
- **No Comments Rule**: DO NOT ADD ***ANY*** COMMENTS unless explicitly requested by the user
- **File Creation Policy**: ALWAYS prefer editing existing files over creating new ones
- **Documentation Policy**: NEVER proactively create documentation files unless explicitly requested

### Testing and Validation
- **No Testing Framework**: Project intentionally has no Jest, ESLint, or other testing/linting tools configured
- **Manual Testing**: Use backend test-api.js and test-client.html for integration testing
- **Device Testing**: Always test on real devices using local network configuration

## TypeScript Integration

The project includes TypeScript configuration but is primarily JavaScript-based:
- **TypeScript Version**: 5.9.2 with React types (19.1.0)
- **Configuration**: Basic tsconfig.json extending expo/tsconfig.base
- **Usage**: TypeScript is available but most components are .js files
- **Mixed Codebase**: Can gradually adopt TypeScript for new components

## SDK 54 Upgrade Notes

The project was successfully upgraded from SDK 53 to SDK 54 in November 2025:

### Critical Changes in SDK 54
- **React Native**: Upgraded to 0.81.5 (from 0.79.5)
- **React**: Upgraded to 19.1.0 (from 19.0.0)
- **Firebase Removed**: All Firebase dependencies removed - project now uses only Socket.IO for multiplayer
- **Required Packages**: `expo-file-system` and `expo-asset` are now explicit dependencies (were previously bundled)

### Installation Issues and Solutions
**Problem**: When upgrading to SDK 54, `expo-file-system` and `expo-asset` may not install correctly from WSL
**Solution**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` from **Windows CMD** (not WSL/Git Bash)
3. Verify installation: `npm list expo-file-system expo-asset`

### Cache Issues After Upgrade
**Problem**: Metro bundler cache may cause "module not found" errors after SDK upgrade
**Solution**:
```bash
# Clear all caches
rm -rf .expo node_modules/.cache
npm run clean:cache

# Or full clean
npm run clean
```

### Tunnel Mode for iOS Testing
**ngrok Configuration**: When testing on iOS with Expo Go (which requires SDK 54):
1. Start ngrok tunnel: `ngrok http 3001` (from Windows CMD as Administrator)
2. Update `src/config/server.js` with ngrok URL in `TUNNEL_SERVER_URL`
3. Start backend: `cd backend && npm run dev`
4. Start Expo: `npm start` (normal mode, not tunnel - backend is already tunneled)

### Compatibility Notes
- **Expo Go iOS**: Latest version only accepts SDK 54+ projects
- **Expo Go Android**: More flexible with SDK versions
- **Windows Development**: Must run `npm install` from Windows CMD for proper permissions
- **WSL Issues**: Package installations from WSL may have permission errors with node_modules

## iOS-Specific Development Patterns

### Modal Implementation for iOS Compatibility

**CRITICAL**: React Native's `<Modal>` component has known issues on iOS that can cause crashes. Always use absolute positioned overlays instead.

#### Problem Pattern (AVOID):
```javascript
<Modal visible={showModal} transparent={true} animationType="none" statusBarTranslucent={true}>
  <Animated.View style={{ transform: [{ scale: modalScale }] }}>
    {/* Complex decorative elements with arrays */}
  </Animated.View>
</Modal>
```

#### Solution Pattern (USE):
```javascript
{showModal && (
  <View style={styles.absoluteOverlay}>
    <Animated.View style={{ opacity: modalOpacity }}>
      {/* Simplified content without complex transforms */}
    </Animated.View>
  </View>
)}
```

#### Key Rules for iOS Modals:
1. **Use Conditional Rendering**: Replace `<Modal>` with `{showModal && <View>}`
2. **Absolute Positioning**: Use `position: 'absolute'` with `zIndex: 9999`
3. **Opacity Only**: Animate only opacity, avoid scale/rotate transforms in modals
4. **No statusBarTranslucent**: This property causes crashes on iOS
5. **Fixed Values**: Use fixed numeric values instead of `scaleByContent()` in modals
6. **Simplify Decorations**: Avoid complex array maps for decorative elements

#### Example from MultiPlayerRegistrationScreen:
```javascript
// Overlay style
absoluteEmojiOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
}

// Container style - fixed values, no transforms
emojiModalContainer: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 25,
  maxWidth: 350,
  width: '85%',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
  elevation: 10,
  borderWidth: 2,
  borderColor: '#000000',
}
```

### Text Rendering Issues on iOS

iOS requires more vertical space for text than Android. Always include extra lineHeight and padding:

#### Problem (Text gets cut off):
```javascript
modeTitle: {
  fontSize: 22,
  lineHeight: 26,  // Too tight for iOS
  marginBottom: 0,
}
```

#### Solution:
```javascript
modeTitle: {
  fontSize: 22,
  lineHeight: 28,  // Extra space for iOS
  marginBottom: 4,
  includeFontPadding: false,  // Better control on both platforms
}
```

### Animation Restrictions on iOS

1. **Avoid Animated.spring in Modals**: Use `Animated.timing` instead
2. **Limit useNativeDriver transforms**: Only use for opacity and simple translateX/Y
3. **Reset Animation Values**: Always call `.setValue()` before showing animated elements
4. **Parallel Animations**: Keep to 2-3 properties max in `Animated.parallel`

#### Safe Animation Pattern:
```javascript
const handleShowModal = () => {
  // Reset first
  modalOpacity.setValue(0);
  setShowModal(true);

  // Simple timing animation
  Animated.timing(modalOpacity, {
    toValue: 1,
    duration: 200,
    useNativeDriver: true,
  }).start();
};
```

### iOS Testing Workflow

1. **Local Testing**: Run Expo in tunnel mode with ngrok for backend connectivity
2. **Modal Testing**: Always test modal open/close on iOS device, not just simulator
3. **Text Verification**: Check all screen sizes - text that fits on Android may clip on iOS
4. **Animation Validation**: Verify animations don't cause crashes on actual iOS devices
5. **Console Monitoring**: Watch for iOS-specific warnings about useNativeDriver or transform properties

### Camera and QR Scanner Issues on iOS

#### QR Scanner Full Screen Issue
**Problem**: QR scanner appears only at bottom of screen instead of full screen
**Cause**: Using `flex: 1` inside a container with complex layout
**Solution**: Use absolute positioning for camera overlay

```javascript
// Container with absolute positioning
qrScannerContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#000',
  zIndex: 10000,
},

// Camera view also absolute
camera: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},
```

#### Photo Capture Black Bars in Landscape
**Problem**: When taking photos horizontally with `allowsEditing: true`, black bars appear because aspect ratio doesn't match landscape orientation
**Solution**: Disable native editor and use automatic center-crop with expo-image-manipulator

```javascript
// Camera options - disable editing
const options = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: false,
  quality: 1.0,
  cameraType: ImagePicker.CameraType.front,
};

// Automatic center-crop to square
const { width: imgWidth, height: imgHeight } = result.assets[0];
const smallerDimension = Math.min(imgWidth, imgHeight);
const cropX = (imgWidth - smallerDimension) / 2;
const cropY = (imgHeight - smallerDimension) / 2;

const imageInfo = await ImageManipulator.manipulateAsync(
  originalUri,
  [
    {
      crop: {
        originX: cropX,
        originY: cropY,
        width: smallerDimension,
        height: smallerDimension,
      }
    },
    {
      resize: {
        width: 500,
        height: 500,
      }
    }
  ],
  {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  }
);
```

### Known iOS Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| App crashes when opening modal | `<Modal>` component with statusBarTranslucent | Use absolute positioned overlay |
| Text cut off at top | Insufficient lineHeight | Increase lineHeight by 20-30% |
| Modal animation crash | Animated.spring with scale transform | Use Animated.timing with opacity only |
| Blank screen on modal | Complex nested decorative elements | Simplify modal content, remove array maps |
| Transform not working | useNativeDriver limitation | Use layout animations or remove transform |
| QR scanner only at bottom | `flex: 1` in complex layout | Use `position: 'absolute'` with full screen coords |
| Black bars on landscape photos | `allowsEditing: true` aspect mismatch | Disable editing, use center-crop with ImageManipulator |