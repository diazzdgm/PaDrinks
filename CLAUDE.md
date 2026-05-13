# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Quality Standards

- **No Comments Rule**: DO NOT ADD ***ANY*** COMMENTS unless explicitly requested by the user
- **File Creation Policy**: ALWAYS prefer editing existing files over creating new ones
- **Documentation Policy**: NEVER proactively create documentation files unless explicitly requested
- **No Testing Framework**: Project has no Jest, ESLint, or linting tools configured
- **Language**: All game content is in Spanish; code identifiers mix English and Spanish. Git commit messages in Spanish
- **Commit Messages**: Follow existing style — Spanish, imperative, descriptive subject line. Example: `Corregir overlap del indicador de conexión con botón mute`. NEVER include `Co-Authored-By` or mention Claude in commits

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

### Web Build & Deployment
```bash
npm run build:web               # Build for web (uses node + local @expo/cli binary, NOT npx expo)
npm run web                     # Dev server for web
npx vercel --prod --yes         # Deploy to Vercel (padrinks.com)
```
- The `build:web` script invokes `node node_modules/@expo/cli/build/bin/cli export --platform web` directly because `npx expo` fails in Git Bash/MINGW. The same applies to all other expo scripts in `package.json` — they bypass `npx` for Windows compatibility.
- `vercel.json` uses `npx expo` directly because Vercel's build environment is Linux where npx works correctly.

## Project Overview

PaDrinks is a React Native drinking game app built with Expo SDK 54 (React 19.1.0, RN 0.81.5, New Architecture enabled). Runs on Android, iOS, and **web** (via `react-native-web`, deployed at padrinks.com on Vercel). Landscape-only orientation (`expo-screen-orientation` plugin + `ScreenOrientation.lockAsync` in App.js). Post-it note aesthetic with notebook paper backgrounds and Kalam handwriting font. `supportsTablet: true` with `UIRequiresFullScreen: true` for iPad.

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
- **AudioService** (`src/services/AudioService.js`): Dual native/web implementation. Pre-loaded sound pool with round-robin playback. `SFX_REGISTRY` defines pool sizes (beer/wine: 3 instances, bell: 2, roulette/bottle/pouring: 1). 100ms cooldown between identical sounds. Background music 15% volume looping, effects 80% volume. Key methods: `preloadSoundEffects()` (called once from MainMenuScreen), `playSoundEffect(key)` (string keys: `'beer'`, `'wine'`, `'bell'`, `'roulette'`, `'bottle'`), `createManagedSound(key)` (for sounds needing manual control like SplashScreen's pouring sound). Mute state persists across screens. On web, uses `HTMLAudioElement` via `WebManagedSound` wrapper instead of `expo-av`
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
`src/utils/responsive.js` is the central scaling system. ALL pixel values in StyleSheets must use it - never hardcode raw numbers.

**Primary function:** `scaleByContent(size, contentType)` - scales values based on device dimensions and content type:
- `'text'` - fontSize (respects system fontScale, capped at 1.8x)
- `'interactive'` - button/input width/height (minimum 44dp touch target)
- `'spacing'` - padding, margin, shadowOffset, shadowRadius (scales at 85%)
- `'icon'` - emoji/image sizes (scales at 90%)
- `'hero'` - large logos/prominent elements (scales at 115%)

**CRITICAL footgun — `'interactive'` has a 44dp floor.** It returns `Math.max(44, N * deviceMultiplier)` to guarantee accessible touch targets. Use it ONLY for `width`/`height`/`min/maxWidth/Height` of touch targets. NEVER for `padding*`, `margin*`, `shadowOffset`, `shadowRadius`, or `gap` — the floor adds 44dp per side, inflating buttons (e.g. `paddingVertical: scaleByContent(8, 'interactive')` produces 44dp top + 44dp bottom + content = ~110dp tall button instead of ~30dp). For ALL spacing values use `'spacing'`. Audit pattern: `grep "padding.*'interactive'"` should always return zero.

**Other key exports:**
- `scaleBorder(size)` - **ALWAYS use for `borderWidth` and `borderRadius`**. Wraps `scaleByContent(size, 'spacing')` with `Math.round()` to guarantee integer pixel values. Fractional border values cause visible pixelation/stepping on iOS.
- `scaleHeight(size)` - scales by height ratio (`SCREEN_HEIGHT / BASE_HEIGHT * size`). Use for vertical positioning that must adapt to screen height (e.g., top offsets for absolute-positioned elements)
- `scaleModerate(size, factor)` - for elements that shouldn't scale too aggressively (e.g., mute button icons: `scaleModerate(50, 0.3)`)
- `isShortHeightDevice()` - returns `true` for `screenHeight < 400 || (screenHeight < 450 && aspectRatio > 2.0)`. Covers Samsung S21 (384px), iPhone Pro Max landscape (430px, aspect 2.17), iPhone SE landscape (375px), iPhone 13/14 (390px). Excludes iPad. Use for 3-tier conditional layouts. Most game screens already wire `isShortHeight` ramas — when adding a new screen, define `const isShortHeight = isShortHeightDevice();` at module level and gate paddings/margins/fontSizes accordingly
- `isSmallDevice()`, `isTablet()`, `getDeviceType()` - device classification
- `SCREEN_WIDTH`, `SCREEN_HEIGHT` - use these instead of `Dimensions.get('window')` anywhere outside responsive.js
- `RESPONSIVE` - pre-calculated common values (spacing.xs/sm/md/lg, fontSize.small/medium/large, button.height, etc.)

**Tablet detection thresholds:** `aspectRatio < 1.65 && screenHeight >= 700` → tablet. deviceMultiplier ranges from 0.52-0.68 for tablets, meaning `scaleByContent` with `'text'` type applies ~0.78x (deviceMultiplier * 1.15 textMultiplier), making text proportionally LARGER than its `'interactive'` container (which gets raw deviceMultiplier). Fix pattern: reduce base font size for tablet using `isTabletScreen ? reducedValue : originalValue` where reducedValue ≈ originalValue * 0.65-0.7.

**Pattern for conditional sizing:** `isShortHeight ? scaleByContent(200, 'interactive') : isSmallScreen ? scaleByContent(300, 'interactive') : scaleByContent(400, 'interactive')`

**Game dynamic layout contract (GameScreen + dynamic display components):**
- `GameScreen.styles.content` uses `justifyContent: 'space-between'` (not `'center'` or `'flex-start'`). This anchors the pink instruction banner to the top, action buttons to the bottom, and lets `questionContainer` (with `flex:1` + internal `justifyContent: 'center'`) fill the middle and center its content vertically. This produces consistent banner Y position and consistent button Y position across ALL dynamics (mention_challenge, vote_selection, preference_vote, anonymous_vote, charades, prize_roulette, spin_bottle).
- Banner styles MUST be unified across `GameScreen.styles.instructionContainer` AND every dynamic component (`PreferenceVoteDisplay`, `AnonymousVoteDisplay`, `CharadesDisplay`, `PrizeRouletteDisplay`, `SpinBottleDisplay`). Canonical values: `marginBottom: isShortHeight ? 12 : 20`, `paddingVertical: isShortHeight ? 8 : 12`, `paddingHorizontal: 20` (no `isShortHeight` gate on horizontal). Mismatches cause the banner to appear at different vertical positions per dynamic.
- `content.paddingHorizontal: isShortHeight ? 70 : 120` — the 120px horizontal padding chokes ultra-wide phones. Always gate with `isShortHeight`.

**Results phase pattern (PreferenceVoteDisplay / AnonymousVoteDisplay):**
- Filter empty entries: `results.filter(r => r.votes > 0)` — never show "Player 0 votos" rows. Show "Nadie recibió votos" fallback when filtered list is empty.
- Use `[styles.questionContainer, styles.questionContainerResults]` style composition. `questionContainerResults` overrides with `alignItems: 'stretch'`, `justifyContent: 'center'`, `width: '100%'` so result rows can use the full available width, vertically centered.
- `resultsContentContainer.alignItems: 'stretch'` (NOT `'center'`) and `paddingHorizontal: isShortHeight ? 50 : 80` to control the horizontal extent of result cards while keeping them anchored stretch-wise (otherwise they collapse to intrinsic content width).

**`alignItems: 'center'` traps children to intrinsic width:**
A flex parent with `alignItems: 'center'` causes children without an explicit width to render at their content-intrinsic width and center horizontally. Even children with `width: '100%'` may not stretch reliably under `alignItems: 'center'` in `react-native-web`. To make a child fill the parent, set `alignItems: 'stretch'` on the parent OR `alignSelf: 'stretch'` on the child. This is THE common cause of "results / cards look narrow / not using all the horizontal space" bugs.

**Tablet/iPad two-column layouts (`MultiPlayerRegistrationScreen`, `PlayerRegistrationScreen`):**
- The `rightSide` column uses `justifyContent: isTabletScreen ? 'flex-start' : 'center' | 'space-between'`. On phones the small viewport requires vertical centering; on iPad the extra height makes centering create big empty space above the first field, misaligning with the `leftSide` (which is anchored top). Always gate with `isTabletScreen` and add a `paddingTop: isTabletScreen ? scaleByContent(45, 'spacing') : 0` so the right column's first label aligns with the left column's `sectionTitle`.

**SplashScreen adaptive sizing (visual hero elements):**
Hardcoded sizes for hero visuals (logo, circular text) clip on short-height devices because they don't scale with viewport height. Pattern in `src/screens/auth/SplashScreen.js`: extract module-level adaptive constants gated by `isShortHeight`/`isTabletScreen` and reference them from styles AND component props. Example: `splashLogoSize` (220 short / 350 phone / 380 tablet), `splashShotWidth/Height`, `splashCircularRadius` (105/150/165), `splashCircularFontSize` (15/22/24). The `<CircularText radius={N} fontSize={N}/>` props accept these directly. On Galaxy S21 landscape (h=360dp) a hardcoded 350×350 container clips ~97% of viewport height — the adaptive 220×220 leaves comfortable margin.

**Android validation workflow (no Chrome DevTools MCP needed):**
After applying responsive fixes, deploy with `npx vercel --prod --yes` and the user manually validates by opening padrinks.com in Chrome → DevTools → toggle device toolbar → select custom Android device → rotate to landscape. Recommended custom devices to add (Width × Height portrait, DPR): Galaxy S21 360×800@3, Pixel 7 412×915@2.625, Pixel 8 Pro 448×992@3, Galaxy A54 412×915@2.625, Galaxy Tab A8 800×1340@2. Pixel 7/A54 with DPR 2.625 are key for catching pixel stepping in rounded borders — always wrap `borderRadius` in `scaleBorder()`. The audit-fix-deploy-validate cycle is the established workflow; do NOT attempt automated Chrome DevTools MCP audits unless explicitly requested.

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
├── utils/platform.js          # isWeb, isNative, web-safe Haptics wrapper
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
└── routes/api.js              # REST endpoints
```

**Backend REST endpoints:** `GET /health`, `GET /api/stats`, `GET /api/rooms`, `GET /api/rooms/:code`, `POST /api/rooms/validate`, `DELETE /api/rooms/:code`, `POST /api/qr/generate`, `POST /api/test/connection`

### Web Platform Support

The web version is a free, single-device-only (no multiplayer) deployment at padrinks.com via Vercel.

**Platform utility** (`src/utils/platform.js`): Exports `isWeb`, `isNative`, and a web-safe `Haptics` wrapper (no-op on web, real `expo-haptics` on native). All 17+ files that use haptics import from here, not directly from `expo-haptics`.

**Conditional native imports pattern**: Native-only modules (`expo-screen-orientation`, `expo-navigation-bar`, `expo-camera`, `expo-image-manipulator`, `expo-file-system`) must use `require()` inside `if (Platform.OS !== 'web')` guards — top-level `import` will crash the web build.

**AudioService dual implementation**: `src/services/AudioService.js` uses `expo-av` on native and `HTMLAudioElement` (wrapped in `WebManagedSound` class) on web. The `WebManagedSound` class mirrors the expo-av Sound API (`playAsync`, `pauseAsync`, `replayAsync`, `setVolumeAsync`, `unloadAsync`). Browsers require a user gesture before audio plays — on web, the splash audio (`pouring.shot.mp3`) fails silently because `audioUnlocked` defaults to `true` (no tap-to-start gate). Background music starts when user taps any button in MainMenuScreen, which counts as the gesture.

**Socket.IO disabled on web**: `SocketService.connect()` returns early on web. `useSocket` hook guards all effects with `if (isWeb) return`. Multiplayer UI (connection indicator, lobby modes) hidden on web via `Platform.OS !== 'web'` checks.

**Fullscreen handling in App.js**: Uses Fullscreen API (`requestFullscreen`) with iOS fallback. On iOS, all browsers use WebKit and historically lack Fullscreen API support (iOS 26+ may support it). Logic: attempt `requestFullscreen()` first → if it fails on iOS, show "Add to Home Screen" instructional banner. PWA mode (`display: fullscreen` in app.json) provides fullscreen when launched from home screen.

**Web orientation lock (CRITICAL limitations)**: `screen.orientation.lock('landscape')` requires BOTH (a) fullscreen mode active and (b) a user gesture. Cannot be triggered by `orientationchange` events alone. iOS Safari has **zero support** for orientation lock — even in PWA/fullscreen it fails. Implementation in App.js: lock attempted from three places — initial mount (line ~67, only succeeds if already in PWA fullscreen), inside `attemptFullscreen()` after success (fires on first tap anywhere), and inside `onFullscreenChange` handler when entering fullscreen (covers F11/browser-initiated fullscreen). Until user's first tap, rotation cannot be programmatically locked.

**Portrait overlay pattern (preserves navigation state)**: When `isPortrait` is true on web, the "GIRA TU TELÉFONO" overlay renders as an **absolute-positioned layer** (zIndex 999998) on top of `AppNavigator`, NOT as an early return. Early returning would unmount the navigator and reset all game state when the user rotates back to landscape. Always use this pattern for any conditional full-screen overlay that should be transient — keep the underlying tree mounted to preserve Redux state, GameEngine singleton, and navigation stack.

**Web deployment** (`vercel.json`): Build command exports via Metro, copies `public/privacy-policy.html` to dist. SPA rewrites with `/privacy-policy` exception. Privacy policy accessible at padrinks.com/privacy-policy.

**Image picker on web**: `expo-image-picker` works on web but camera doesn't — web always uses `launchImageLibraryAsync()`. `expo-image-manipulator` doesn't work on web — skip manipulation, use picker URI directly.

**Fullscreen onboarding overlay** (`src/screens/web/FullscreenOnboardingScreen.js`): Web-only educational overlay that teaches users to "Add to Home Screen" so the game can run truly fullscreen (the only path on iOS Safari, where `requestFullscreen()` and `screen.orientation.lock()` are blocked). Rendered as an absolute layer in `App.js` (zIndex `999997`, below the portrait overlay at `999998`) — NOT an early return, follows the "Portrait overlay pattern" to preserve `AppNavigator` + Redux state. Mount condition is evaluated synchronously in `useState(() => ...)` initializer:
- `Platform.OS === 'web'` AND
- NOT PWA standalone (`display-mode: standalone | fullscreen` or `navigator.standalone === true`) AND
- `localStorage.padrinks_skip_fullscreen_onboarding !== 'true'`

If the user chooses "Jugar con barra de navegación", the localStorage flag is set and the overlay never appears again. If they install to home and open from the icon, PWA standalone detection skips it automatically. Vista A (OS selection): two compact square cards (iPhone yellow, Android green) with Apple/Android SVG logos via `react-native-svg`. Vista B (tutorial): video frame (white, ready for `.mp4` files in `assets/videos/tutorial-ios.mp4` / `tutorial-android.mp4`, falls back to empty white box if files missing) + numbered text steps to the right. Step 1 of iOS renders the iOS share icon (`ShareIcon` SVG) inline at text-emoji size after "Toca el botón de compartir del navegador".

**Coupling: SplashScreen audio gated by overlay state**: `src/screens/auth/SplashScreen.js` `loadAndPlaySound()` early-returns when the onboarding overlay would be visible (re-evaluates the same PWA + localStorage check). This is because SplashScreen is mounted underneath the overlay and would otherwise play the pouring-shot sound while the user reads the onboarding. If you change the localStorage key or the mount condition of `FullscreenOnboardingScreen`, mirror it in SplashScreen.

**Removed legacy fullscreen UX in App.js**: The pre-overlay iOS reactive banner, `handleFirstTouch` global handler, `showIOSBanner` state, and the floating fullscreen button were all removed when the overlay was introduced. `getWebBrowserInfo()` and `tryFullscreen()` remain because they're still useful for Android Chrome when the user opts into "barra de navegación" mode.

### EAS Build Profiles
- `development`: Dev client, internal distribution, iOS simulator only
- `preview`: Internal distribution, APK for Android, Node 20.18.1
- `production`: App bundle for Android, App Store for iOS, Node 20.18.1

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
- **iPad orientation lock** only works in production/development builds, NOT in Expo Go (Expo Go's own Info.plist overrides app orientation settings)
- **Never rotate bordered elements** - `transform: [{ rotate }]` on elements with `borderWidth` + `borderColor: '#000000'` causes visible pixel stepping on iOS. Even 0.3deg rotation creates a staircase effect on long borders. Use `rotate: '0deg'` for all bordered buttons/containers. Decorative rotations (5deg, 15deg, 45deg for tape/arrows/X-marks) on non-bordered elements are fine.

### Audio Management
- Sound effects are pre-loaded at app startup via `audioService.preloadSoundEffects()` in MainMenuScreen
- `playSoundEffect(key)` uses string keys (not `require()`): `'beer'`, `'wine'`, `'bell'`, `'roulette'`, `'bottle'`
- `createManagedSound(key)` for sounds needing seek/fade control (caller owns cleanup)
- `Audio.setAudioModeAsync()` called once via `ensureAudioMode()` — never call it per-sound
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

### Touch / Swipe Gesture System (cross-platform: native + web mobile + web desktop)
DO NOT use PanResponder (breaks React Navigation). DO NOT rely solely on `onTouchStart/Move/End` either — when a swipe View wraps a `TouchableOpacity` (e.g. CreateGameScreen carousel), the child grabs the responder on Android and the parent never receives the moves, so swipe silently fails on real devices. Use the **Responder system** with capture variants instead:

```jsx
<View
  onStartShouldSetResponderCapture={(e) => {
    // Capture initial X without claiming the responder — TouchableOpacity stays clickable for taps
    const x = getPointerX(e);
    if (x !== null) {
      touchStartRef.current = x;
      touchEndRef.current = null;
      isPointerDownRef.current = true;
    }
    return false;
  }}
  onMoveShouldSetResponderCapture={(e) => {
    // Steal the responder when finger has moved >10px horizontally
    if (touchStartRef.current === null) return false;
    const x = getPointerX(e);
    return x !== null && Math.abs(x - touchStartRef.current) > 10;
  }}
  onResponderMove={onTouchMove}
  onResponderRelease={onTouchEnd}
  onResponderTerminate={onTouchEnd}
  onResponderTerminationRequest={() => false}
  {...(Platform.OS === 'web' && {
    onMouseDown: onTouchStart, onMouseMove: onTouchMove,
    onMouseUp: onTouchEnd, onMouseLeave: onTouchEnd,
  })}
>
```

**Critical implementation details:**
- **Refs, not `useState`, for `touchStartRef` / `touchEndRef` / `isPointerDownRef`**. State setters are async and handlers close over stale values — `useState` causes "swipe not detected" bugs because `onTouchMove` reads `isPointerDown=false` from the previous render even after `onTouchStart` set it true.
- Use a `useEffect` to mirror any state value used inside handlers into a ref (e.g. `selectedModeIndexRef.current = selectedModeIndex`).
- `getPointerX(e)` helper handles both touch and mouse: tries `e.nativeEvent.pageX`, then `e.nativeEvent.clientX`, then `e.pageX`, then `e.clientX`. Mouse events on `react-native-web` may pass through DOM events directly (no `nativeEvent` wrapper), so check both.
- Desktop web mouse drag requires the `onMouseDown/Move/Up/Leave` spread — touch handlers do NOT fire for mouse. Use `onMouseLeave` to cancel a swipe when the cursor exits the area mid-drag.
- Add `userSelect: 'none'` and `cursor: 'grab'` to the swipe area style (web-only via `Platform.OS === 'web'` spread) to prevent text selection during drag.
- Track `isSwipeInProgress` (this one IS state, drives re-render) to suppress the inner `TouchableOpacity` `onPress` during/right-after a swipe. 50px is the swipe-distance threshold; 10px is the responder-capture threshold (must be smaller so capture happens before the user notices).

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

### Top-Right Corner Layout (Mute Button + Connection Indicator)
Multiple screens have a mute button and connection status indicator in the top-right corner. The connection indicator must be positioned **below** the mute button (not beside or overlapping). Calculate `top` as: `topOffset + muteButtonTop + muteButtonSize + gap` using the same `rightOffset` for horizontal alignment. Both use `useSafeAreaOffsets` for safe area insets.

### Navigation Patterns
- Always use `navigation.reset()` instead of `goBack()` to prevent "GO_BACK action not handled" errors
- Always provide default values for route parameters
- Always pass `registeredPlayers` in navigation params to prevent state loss
