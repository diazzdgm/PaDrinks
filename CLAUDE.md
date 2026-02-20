# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Quality Standards

- **No Comments Rule**: DO NOT ADD ***ANY*** COMMENTS unless explicitly requested by the user
- **File Creation Policy**: ALWAYS prefer editing existing files over creating new ones
- **Documentation Policy**: NEVER proactively create documentation files unless explicitly requested
- **No Testing Framework**: Project has no Jest, ESLint, or linting tools configured
- **Language**: All game content is in Spanish; code identifiers mix English and Spanish

## Development Commands

### Frontend (React Native / Expo)
```bash
npm start                      # Start dev server (uses expo-start.js wrapper for Windows)
npm run start:clear            # Start with cache clear
npm run start:tunnel           # Tunnel mode for external device testing
npm run android                # Run on Android
npm run ios                    # Run on iOS
npm run clean                  # Full clean: rm node_modules/.expo/package-lock.json + reinstall
npm run clean:cache            # Clear Metro cache only
npm run build:android          # Build APK via EAS (preview profile)
```

### Backend (Node.js + Socket.IO)
```bash
cd backend && npm run dev      # Dev server with auto-reload (port 3001)
cd backend && npm start        # Production server
cd backend && node test-api.js # Run API integration tests
curl http://localhost:3001/health  # Health check
```

### iOS Builds
```bash
eas build -p ios --profile development  # Simulator
eas build -p ios --profile preview      # TestFlight
eas build -p ios --profile production   # App Store
```

### Windows Notes
- Run backend from **Windows CMD** (not WSL) to avoid IP resolution issues with mobile devices
- `npx expo` fails in Git Bash/WSL - use `npm start` which uses the custom `expo-start.js` wrapper
- For mobile device testing, update IP in `src/config/server.js` (use `ipconfig` to find local IP)
- Never commit `package-lock.json` (intentionally excluded; EAS uses `npm install` not `npm ci`)

## Project Overview

PaDrinks is a React Native drinking game app built with Expo SDK 54 (React 19.1.0, RN 0.81.5). Landscape-only orientation. Post-it note aesthetic with notebook paper backgrounds and Kalam handwriting font.

## Architecture

### Application Flow
```
App.js (SafeAreaProvider + Redux Provider + Font Loading + Immersive Mode)
└── AppNavigator (Stack Navigator, back button blocked on all screens)
    ├── SplashScreen → AgeVerificationScreen → MainMenuScreen
    ├── CreateGameScreen (game mode carousel) → SingleDeviceSetup/LobbyConfig
    ├── MultiPlayerRegistrationScreen → CreateLobbyScreen → GameScreen
    ├── PlayerRegistrationScreen (multiplayer) → CreateLobbyScreen
    └── JoinGameScreen (room code / QR scan) → PlayerRegistrationScreen
```

### State Management
Redux Toolkit with three slices:
- `gameSlice`: Game state, currentQuestion, gamePhase, questionsRemaining, all tracking state (mention challenge, paired challenge, anonymous vote, preference vote)
- `playersSlice`: Player management
- `connectionSlice`: Socket.IO connection state, room data

### Key Singletons
- **GameEngine** (`src/game/GameEngine.js`): Access via `getGameEngine()`, never instantiate directly. Manages rounds (50 base + 25 extensions), player validation, dynamic appearance counting
- **DynamicsManager** (`src/game/DynamicsManager.js`): Random dynamic selection, question deduplication, dynamic deactivation when exhausted
- **AudioService** (`src/services/AudioService.js`): Background music (15% volume, looping), sound effects (80% volume), mute state persists across screens
- **SocketService** (`src/services/SocketService.js`): Socket.IO connection management with 30s timeouts, exponential backoff reconnection

### Game Dynamics System
JSON-based dynamics stored in `src/data/dynamics/`. Each dynamic has `id`, `name`, `type`, `instruction`, `minPlayers`, `questions[]`.

**Dynamic types and their behavior:**
- `vote_selection`: Group voting (whoIsMost, whoIsMoreLikely, INeverNever)
- `mention_challenge`: Individual player challenges with rotation/anti-repetition tracking per dynamic (mentionChallenge, awkwardQuestions, challengeOrShot)
- `paired_challenge`: Two-player challenges with gender-based pairing (armWrestling, rockPaperScissors, headHeadSplash, drinkingCompetition, charadesDynamic, prizeRoulette, spinBottle). Questions NOT marked as used
- `preference_vote`: Multi-phase voting on two options (whatDoYouPrefer). Questions NOT marked as used
- `anonymous_vote`: Multi-phase anonymous voting with phone passing (anonymousQuestions). Questions NOT marked as used

**Special paired_challenge handling in GameScreen:**
- `prize_roulette`: Single-player (player2 = null), blocks after all players participate
- `spin_bottle`: Group dynamic, no player selection, max 3 appearances per game (tracked by GameEngine)
- `charades_dynamic`: Has its own component with timer and phrase bank

### Responsive Design
`src/utils/responsive.js` provides `scaleByContent(size, contentType)` with content types: 'text', 'icon', 'interactive', 'spacing'. Use `isSmallScreen` / `isTabletScreen` for conditional styling.

### Folder Structure
```
src/
├── components/common/         # Shared components
├── components/game/           # Game-specific components (CharadesDisplay, PrizeRouletteDisplay, etc.)
├── config/server.js           # Backend URL with priority: tunnel > manual IP > auto-detect
├── data/dynamics/             # Game question JSON files
├── game/                      # GameEngine.js, DynamicsManager.js
├── hooks/                     # useSafeAreaOffsets.js
├── navigation/                # AppNavigator
├── screens/auth/              # AgeVerificationScreen
├── screens/game/              # All game screens
├── services/                  # AudioService, SocketService, RoomService
├── store/                     # Redux slices (gameSlice, playersSlice, connectionSlice)
├── styles/theme.js            # Post-it colors, Kalam fonts, responsive values
└── utils/responsive.js        # Cross-device scaling system
```

### Backend Structure
```
backend/src/
├── server.js                  # Express + Socket.IO (port 3001, binds 0.0.0.0)
├── socket/socketHandler.js    # Primary Socket.IO event handlers
├── socket/gameEvents.js       # Game-specific events
├── models/Room.js, Player.js  # In-memory models (NodeCache)
├── utils/roomManager.js       # Room storage
└── routes/api.js              # REST endpoints (validateRoom, getRoomInfo)
```

## Critical Patterns and Gotchas

### Animation System
- Use `Animated.Value` refs; never mix with static values in transform arrays
- **Avoid** `Animated.sequence`/`Animated.parallel` in `useFocusEffect` - causes `useInsertionEffect` warnings. Use simple `Animated.timing` + `setTimeout` for staggering
- Particle effects: arrays of animated values for individual particles

### iOS-Specific Rules (CRITICAL)
- **Never use `<Modal>` component** - causes crashes on iOS. Use conditional rendering with absolute positioned overlays (`{showModal && <View style={{position: 'absolute', zIndex: 9999}}>}`)
- Animate **opacity only** in modals - avoid scale/rotate transforms
- Use `Animated.timing` not `Animated.spring` in modals
- iOS needs 20-30% more lineHeight than Android; use `includeFontPadding: false`
- QR scanner must use absolute positioning (not `flex: 1`) for full-screen display
- Disable `allowsEditing` for landscape photos; use ImageManipulator center-crop instead

### Audio Management
- All audio requires cleanup in `useFocusEffect` return functions
- Audio configuration must be set before each playback
- Audio files in `assets/sounds/`

### Android Immersive Mode
- `expo-navigation-bar` hides nav bar with `inset-swipe` behavior, re-applied every 500ms
- Requires `edgeToEdgeEnabled: false` in app.json
- Multi-layer back button blocking: App.js global + AppNavigator useEffect + onStateChange re-registration (single layer doesn't survive screen transitions)

### GameScreen Lifecycle (State Cleanup)
Cleanup order is critical to prevent state pollution between games:
1. Clear `currentQuestion` first (stops useEffect processing)
2. Clear local state and refs
3. Reset GameEngine singleton
4. Clear Redux state last
- **Must use `navigation.reset()`** not `navigate()` to properly dismount GameScreen
- Both `GameScreen.handleEndGame()` and `GameConfigModal.handleEndGame()` must implement identical cleanup

### Player ID Comparison
Always use `String(p.id) !== String(playerId)` due to mixed number/string ID types between original and dynamically-added players.

### Socket.IO Event Listeners
- Register in useEffect with proper cleanup (remove in return function)
- Define handlers within useEffect scope to access current state
- Store sync timeout refs with `useRef` for cancellation during cleanup
- Cancel automatic room sync timeouts after player kicks to prevent "Player not found" errors

### Touch Gesture System
Use `onTouchStart`/`onTouchMove`/`onTouchEnd` (not PanResponder) for React Navigation compatibility. Track `isSwipeInProgress` to prevent button clicks during swipes. 50px threshold for valid swipes.

### Image Processing
Always compress photos via expo-image-manipulator before Socket.IO transmission (large base64 causes disconnections). Standard: 150x150px, 30% quality for Socket.IO; 500x500, 80% for local display.

### Metro Configuration
`metro.config.js` blocks `backend/`, `mcp-servers/`, and `.bin/` directories from bundling. Windows-specific file watcher adjustments included.

### Safe Area (iOS Notch/Dynamic Island)
Use `useSafeAreaOffsets` hook from `src/hooks/useSafeAreaOffsets.js` for all fixed-position buttons (back buttons, mute buttons). Returns `leftOffset`, `rightOffset`, `topOffset` with minimum values for Android compatibility.

### Server Configuration
`src/config/server.js` has priority-based URL resolution: tunnel (ngrok) > manual IP > auto-detect. Supports Android emulator (10.0.2.2:3001), iOS simulator (localhost:3001), and real devices.

### CreateLobbyScreen Layout
- Single device mode: Use `playerItemFixedSafe` style with exact height to prevent variable box sizes
- Kick buttons: absolute positioning to float over player items
- Dual mode: handles both host creation (`isJoining=false`) and player joining (`isJoining=true`)

### Navigation Patterns
- Always use `navigation.reset()` instead of `goBack()` to prevent "GO_BACK action not handled" errors
- Always provide default values for route parameters
- Always pass `registeredPlayers` in navigation params to prevent state loss
