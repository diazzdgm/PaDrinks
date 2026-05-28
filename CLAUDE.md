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

**Web portrait→landscape reload-once pattern (CRITICAL)**: All `StyleSheet.create({...})` calls (including those gated by `isShortHeight`/`isTablet`) execute exactly once when the JavaScript bundle is evaluated. If the page loads in portrait, every screen captures portrait-orientation dimensions, and rotating to landscape leaves layouts broken across all ~30 screens. App.js implements a **one-shot page reload** when transitioning portrait→landscape, guarded by `sessionStorage.padrinks_reloaded_for_landscape`:
- If `window.innerWidth > window.innerHeight` at mount → page loaded in landscape, set the flag and exit (no listener).
- If the flag is already `'true'` at mount → user previously rotated this session, do NOT reload again (prevents loops + preserves game state if user accidentally rotates to portrait mid-game).
- Otherwise (loaded in portrait, flag not set) → attach `resize` + `orientationchange` listeners; on first event where `innerWidth > innerHeight`, set the flag and call `window.location.reload()` after 400ms.

Do NOT use dimension-delta thresholds (e.g., `shortChanged > 30`) to trigger the reload — Chrome's URL bar auto-show/hide causes false positives within the first 2 seconds of every load, producing infinite reload loops. The boolean orientation check (`innerWidth > innerHeight`) is robust because it transitions exactly once per actual rotation.

Companion pattern for screens that must look correct BEFORE the reload completes (e.g., `FullscreenOnboardingScreen` is visible during the ~400ms gap between rotation and reload): make the component reactive by calling `useWindowDimensions()` inside the component, recomputing `isShortHeight`/`isTablet` flags on each render, and wrapping `StyleSheet.create({...})` in a `createStyles({...flags})` function memoized with `useMemo`. Pass the resulting `styles` (and flags where needed) as props to child components instead of closing over module-level constants. Reserve this refactor for the very first screens the user sees during rotation — for all other screens, the page reload handles it.

**Web deployment** (`vercel.json`): Build command exports via Metro, copies `public/privacy-policy.html` to dist. SPA rewrites with `/privacy-policy` exception. Privacy policy accessible at padrinks.com/privacy-policy.

**Image picker on web**: `expo-image-picker` works on web but camera doesn't — web always uses `launchImageLibraryAsync()`. `expo-image-manipulator` doesn't work on web — skip manipulation, use picker URI directly.

**Fullscreen onboarding overlay** (`src/screens/web/FullscreenOnboardingScreen.js`): Web-only educational overlay that teaches users to "Add to Home Screen" so the game can run truly fullscreen (the only path on iOS Safari, where `requestFullscreen()` and `screen.orientation.lock()` are blocked). Rendered as an absolute layer in `App.js` (zIndex `999997`, below the portrait overlay at `999998`) — NOT an early return, follows the "Portrait overlay pattern" to preserve `AppNavigator` + Redux state. Mount condition is evaluated synchronously in `useState(() => ...)` initializer:
- `Platform.OS === 'web'` AND
- NOT PWA standalone (`display-mode: standalone | fullscreen` or `navigator.standalone === true`) AND
- `localStorage.padrinks_skip_fullscreen_onboarding !== 'true'`

If the user chooses "Jugar con barra de navegación", the localStorage flag is set and the overlay never appears again. If they install to home and open from the icon, PWA standalone detection skips it automatically. Vista A (OS selection): two compact square cards (iPhone yellow, Android green) with Apple/Android SVG logos via `react-native-svg`. Vista B (tutorial): video frame on left + numbered text steps on right. Video sources are at `assets/videos/Chrome.Android.Tutorial.mp4` (Android, currently shipped, 18.97s @ 1602×720, ~600KB after CRF24 compression) and `assets/videos/tutorial-ios.mp4` (iOS, placeholder — falls back to empty white box if missing). Step 1 of iOS renders the iOS share icon (`ShareIcon` SVG) inline at text-emoji size after "Toca el botón de compartir del navegador".

**Vista B layout (Android-specific)**: To prevent the install banner from covering the tutorial title, View B uses an asymmetric layout. The `bannerContainerB` (title "Cómo activar pantalla completa" + subtitle "En Chrome — Android") is **left-aligned** with explicit `paddingLeft` (105/130 to clear the absolute "← Volver" back button) and `paddingRight` (235/275/315 to reserve right-side space for the install banner). Title and subtitle Text elements compose `{ textAlign: 'left' }` inline only when `selectedOS === 'android'` so iOS keeps the centered layout. The `<PWAInstallBanner>` is absolutely positioned in the top-right corner via `cardWrapper: { position: 'absolute', top, right, zIndex: 9 }` with explicit responsive `width` on the `card` (220/260/300). The video frame uses `aspectRatio: 1602/720` + `width: '100%'` + `maxHeight: '100%'` so the white-bordered box auto-sizes to match the video's native ratio (no letterbox bars). `<video>` inside uses `width:'100%'`, `height:'100%'`, `objectFit:'cover'` since the frame aspect matches exactly.

**PWA install banner (`src/screens/web/PWAInstallBanner.js`)**: Custom React banner that replaces Chrome's native install UI. The `beforeinstallprompt` and `appinstalled` listeners MUST be registered at **module scope** (top-level `window.addEventListener` outside the component function, guarded by `typeof window !== 'undefined' && Platform.OS === 'web'`), NOT inside `useEffect`. Reason: Chrome fires `beforeinstallprompt` very early in the page lifecycle. If the listener lives inside the component's `useEffect`, it only registers when the user enters View B (selects Android) — by then Chrome already fired the event and showed its native install banner ("Install PaDrinks / www.padrinks.com / Install" in gray-white, no yellow button, no ×). That native UI is part of Chrome's chrome, NOT the page DOM, and cannot be repositioned from JS. Module-level listener captures the event before any React tree mounts and calls `e.preventDefault()` to suppress Chrome's UI, then stores the prompt in a `let moduleDeferredPrompt` shared via a `Set<callback>` of subscribers. The component reads initial state from `useState(() => moduleDeferredPrompt !== null)` and subscribes via `useEffect`. Validation: after deploying any change here, hard-reload Chrome on Android — the bundle is cached aggressively and a stale bundle will show Chrome's native banner even when the fix is correct in source.

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

**Audio initialization coupling with MainMenuScreen (CRITICAL):** both `audioService.preloadSoundEffects()` and `audioService.initializeBackgroundMusic()` are called ONLY from `MainMenuScreen.js:151-152`. Both are idempotent (internal guards `if (this.sfxReady) return` / `if (this.backgroundMusic) return`). Any flow that navigates to GameScreen — or any screen that uses audio — while **skipping MainMenu** (deep links, snapshot restore, automated test flows) MUST call both manually in the same handler that triggers the navigation, BEFORE the `navigationRef.reset()` / `navigate()`. The button tap that triggers the navigation counts as the user gesture needed to unlock the browser audio context. Otherwise SFX call sites (`playSoundEffect('bell'|'roulette'|'bottle')`) fail silently and background music never starts (a `toggleMute` round-trip works around it by accidentally calling `playBackgroundMusic` internally — that's a symptom, not a fix).

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

### Single-device players source of truth (CRITICAL)
In `single-device` mode, players live in `allGamePlayers` (a useState in `GameScreen.js`, initialized from `route.params.registeredPlayers`). `CreateLobbyScreen` NEVER dispatches `addPlayer` to Redux in single-device mode — it only passes the player array as a route param. Therefore `state.players.playersList` is **empty** during the entire single-device game. The only time Redux receives players in single-device is when the host adds extra players mid-game via `GameConfigModal` → "Agregar Jugador" (which dispatches `addPlayer`); those land in Redux but the original ones do NOT.

**How to apply:** any feature that needs the full player list in single-device (persistence/snapshots, debug overlays, telemetry, mid-game additions) MUST read from `allGamePlayers` (passed as prop from GameScreen) or `route.params.registeredPlayers`, never from `useSelector(state => state.players.playersList)`. `GameConfigModal` already does this correctly: `const allPlayers = allGamePlayers;` (`GameConfigModal.js:44`) — `playersList` from Redux is only used to detect dynamically-added players for the `removePlayer` dispatch path.

### Game state persistence (web/PWA only)
Feature: when a user closes the browser/tab/PWA mid-game on padrinks.com and returns within 24h, a modal `¿Seguimos bebiendo?` appears 6s after the splash offering to continue exactly where they left off. Implemented in `src/services/GameSnapshotService.js` (singleton, localStorage key `padrinks_game_snapshot_v1`, SCHEMA_VERSION 1, TTL 24h). Web-only — guarded with `Platform.OS === 'web'` (no-op on native).

**Auto-save points** (all check `gamePhase === 'playing' | 'paused'` before writing):
- `GameScreen.js` useEffect with deps `[currentQuestion?.id, gamePhase, allGamePlayers.length]` — saves on every question change AND when the player list changes (the latter catches mid-game `Agregar Jugador` additions).
- `App.js` listeners `beforeunload`, `pagehide`, and `visibilitychange === 'hidden'` — calls `saveSnapshot(store.getState(), getGameEngine().saveGameState(), null)` (the `null` signals "preserve previous gameScreen block").

**Snapshot shape:** `{ version, savedAt, redux: { game, players }, engine: GameEngine.saveGameState(), gameScreen: { allGamePlayers, selectedPlayerForQuestion, selectedPairedPlayers, skippedPairedDynamicIds[], lastProcessedQuestionId } }`. **`allGamePlayers` is CRITICAL** — without it the restored game has no player names (see "Single-device players source of truth" above). `skippedPairedDynamicIds` is a `Set` in memory but serialized as Array.

**Cleanup points** (all call `GameSnapshotService.clearSnapshot()` BEFORE Redux reset, so a beforeunload race doesn't re-save a partially-cleared state):
- `GameScreen.handleEndGame()`.
- `GameScreen` useEffect that detects `result.gameEnded === true` (paths in `handleContinue` and `handleSkipDynamic`).
- `GameConfigModal.handleEndGame()` — must stay in sync with the GameScreen one.

**Restore flow** (`App.js handleResumeContinue`): dispatch `hydrateFromSnapshot` on both `gameSlice` and `playersSlice` (the reducer is `(state, action) => action.payload` — full replace), `getGameEngine().loadGameState(snapshot.engine)`, then **`audioService.preloadSoundEffects()` + `audioService.initializeBackgroundMusic()`** (we skip MainMenu — see Audio Management above), then `navigationRef.reset({ ..., routes: [{ name: 'GameScreen', params: { isResume: true, gameScreenState, registeredPlayers: snapshot.gameScreen.allGamePlayers, gameMode } }] })`. `navigationRef` is exported from `src/navigation/AppNavigator.js` (`createNavigationContainerRef`).

**GameScreen `isResume` gate** (in the route-params useEffect): when `route.params.isResume && !hasResumedRef.current`, restore `skippedPairedDynamicIds.current` (Array→Set), `lastProcessedQuestionId.current`, `setAllGamePlayers([...gs.allGamePlayers])` (defensive even though the useState initializer already read from `route.params.registeredPlayers`), `setSelectedPlayerForQuestion`, `setSelectedPairedPlayers`, set `gameInitialized.current = true`, and **return early** to skip the "primera pregunta" initialization logic (Redux + GameEngine already hold the resumed state).

**Modal `ResumeGameModal`** (`src/components/web/ResumeGameModal.js`): post-it style identical to `GameConfigModal`'s confirmation pattern. zIndex `999996` (below portrait/onboarding overlays at 999997/999998). Buttons: left "Nueva partida" (`postItYellow`, calls `onCancel` → clearSnapshot + dismiss), right "¡Continuar!" (`postItGreen`, calls `onContinue`). Animation: opacity only, 200ms in, 100ms out on continue (snappy) / 150ms on cancel.

**Common bugs avoided / fixed in this feature's iteration:**
- Snapshot guarded `state.players.playersList` (empty in single-device) → restored game showed "Jugador 1/2/3..." fallbacks. Fix: persist `allGamePlayers` in `gameScreen` and use it as `registeredPlayers` on restore.
- Skipping MainMenu meant SFX never loaded and background music never started. Fix: call `preloadSoundEffects()` + `initializeBackgroundMusic()` in `handleResumeContinue`.
- Reload-by-rotation (`padrinks_reloaded_for_landscape` sessionStorage) only fires on MainMenu before any game starts, so it does NOT conflict with the snapshot flow — no special handling needed.

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

### Premium Subscription / Auth / Paywall (Web Only — LIVE since 2026-05-27)

Web-only monetization at padrinks.com. **Apps nativas NO llevan paywall/auth** (Apple/Google prohíben Stripe para suscripciones digitales). Todo el código nuevo va detrás de `Platform.OS === 'web'` / `isWeb`.

**Flow:** `Splash → AgeVerification → LoginScreen → MainMenu → … → GameScreen` (paywall en ronda 30).

**File map del feature:**
- `src/config/supabase.js`: URL + publishable key (públicos, safe to commit).
- `src/lib/supabase.js`: cliente web-only (lazy `require` dentro de guard de Platform), persistSession + detectSessionInUrl + PKCE.
- `src/services/AuthService.js`: `signInWithGoogle/Apple`, `getSession`, `getUser`, `getAccessToken`, `signOut`, `onAuthStateChange`.
- `src/services/SubscriptionService.js`: `getEntitlement`, `hasActiveSubscription`, `startCheckout(plan, { onBeforeRedirect })`, `openPortal`.
- `src/screens/web/LoginScreen.js`: botones oficiales Google/Apple (fuente **sans-serif de sistema**, NO Kalam), SVG inline; detecta sesión y auto-forwardea a MainMenu si ya logueado.
- `src/components/web/PaywallModal.js`: 2 planes lado-a-lado (`flexDirection: 'row'` siempre, app landscape-only), prop opcional `subtitle` para reusar fuera de ronda 30, `maxHeight: SCREEN_HEIGHT * 0.9` + ScrollView interno.
- `src/components/web/ProfileModal.js`: cuenta (correo en badge), Suscripción + botón Cancelar/Premium en la MISMA fila (`marginLeft: 'auto'` para el botón). `paddingLeft: 38` en `infoSection` para respetar el margen rojo del cuaderno.
- `src/components/web/LoadingOverlay.js`: overlay full-screen con fondo de libreta + "Cargando..." con dots animados (interval 400ms, cleared on unmount).
- `api/_lib/clients.js`: clients compartidos. **`PRICE_BY_PLAN` es env-aware**: `PRICES_LIVE` si `process.env.STRIPE_SECRET_KEY` empieza con `sk_live`, si no `PRICES_TEST`.
- `api/create-checkout-session.js`, `api/stripe-webhook.js`, `api/create-portal-session.js`: serverless Node CommonJS (`module.exports = async (req, res) => …`).
- `scripts/generate-apple-secret.js`: regenerar el JWT de Sign In with Apple cada ~6 meses (next: **~2026-11-24**). Uso: `node scripts/generate-apple-secret.js /ruta/al/AuthKey_<KEY_ID>.p8`.
- `scripts/test-supabase.js`: diagnóstico local del service_role.
- `.mcp.json`: Stripe MCP project-scoped (OAuth a `https://mcp.stripe.com`). El MCP **solo opera en TEST mode**.

**Supabase project:** `https://moyvfmaftjyapbnozemp.supabase.co`. Tabla `public.subscriptions(user_id uuid PK references auth.users, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end, updated_at)`. RLS (own-row SELECT) + **GRANTs explícitos** (porque desactivamos "Automatically expose new tables" al crear el proyecto): `grant select,insert,update,delete on public.subscriptions to service_role; grant select on public.subscriptions to authenticated;`. Sin estos GRANTs incluso `service_role` recibe `permission denied`.

**Stripe IDs (cuenta `acct_1Tb9dcJe8NaSnHv6`, activada 2026-05-27):**
- TEST: product `prod_UaLPsbUhHySWtC`, mensual `price_1TbAjOJe8NaSnHv6OqVpS0T5`, anual `price_1TbAjSJe8NaSnHv6zTZaCb2k`.
- LIVE: mensual `price_1TbrFwJOr3M3dXYuzc4MeAzi`, anual `price_1TbrFuJOr3M3dXYuEj2jDhXf`.

**Vercel env vars (per-environment, MISMO NOMBRE distinto scope — NUNCA sufijos como `_PRODUCTION`):**
- `STRIPE_SECRET_KEY`: `sk_test_...` (Preview) | `sk_live_...` (Production).
- `STRIPE_WEBHOOK_SECRET`: test whsec (Preview) | live whsec (Production).
- `SUPABASE_SERVICE_ROLE_KEY`: misma secret (Production + Preview).
- El código lee `process.env.STRIPE_SECRET_KEY` exacto — nombrarla `STRIPE_SECRET_KEY_PRODUCTION` la deja inerte.

**Webhook URLs (eventos: `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`):**
- Test: registrado en la URL de preview actual; re-apuntar tras cada deploy nuevo si se va a probar pago. **Vercel Deployment Protection ("Vercel Authentication") debe estar DISABLED** en el proyecto, o Stripe recibe 401 (el navegador del owner pasa por SSO, Stripe no).
- Live: `https://www.padrinks.com/api/stripe-webhook` (estable).

**Gate del paywall en `src/screens/game/GameScreen.js`:** `FREE_ROUND_LIMIT = 30`. **Tanto `handleContinue` como `handleSkipDynamic`** están gateados con `if (isWeb && !entitled && currentRound >= FREE_ROUND_LIMIT) { setShowPaywall(true); return; }`. `entitled` se carga al montar via `SubscriptionService.hasActiveSubscription()` + se refresca en `onAuthStateChange`.

**Round-trip del checkout (no perder partida):** Stripe Checkout redirige fuera de la SPA. `SubscriptionService.startCheckout(plan, { onBeforeRedirect: () => GameSnapshotService.saveSnapshot(state, engineState, gameScreenState) })` guarda snapshot antes del redirect. `success_url`/`cancel_url` = `${origin}/?checkout=success|cancel`. En `App.js`, el efecto detecta `?checkout=` + snapshot válido y llama `autoResumeAfterRedirect(snapshot, checkoutResult)` que hidrata Redux+GameEngine + reinicia audio + navega a `GameScreen` con `isResume: true, resumePaywall: true, checkoutResult`. En `GameScreen` el efecto `resumePaywall` polea `hasActiveSubscription` 6× cada 1.5s para tolerar lag del webhook (en cancel reabre paywall).

**LoadingOverlay durante el checkout:** al elegir plan, `setShowPaywall(false)` + `setPaywallLoading(true)` (el overlay aparece de inmediato sin gap). En fallo, overlay cierra y paywall reabre.

**Login obligatorio + persistencia de edad:** `AgeVerificationScreen.handleYesPress` persiste `localStorage.padrinks_age_verified = 'true'`. `SplashScreen` detecta el flag y en cargas posteriores acorta el splash a **1500ms** (vs 6000ms primera vez) y navega directo a `Login` saltando el age screen — evita re-confirmar edad tras cada OAuth redirect.

**Webhook silent-fail prevention:** en `api/stripe-webhook.js`, capturar `{ error }` del `supabase.upsert(...)` y `throw` para que el catch externo devuelva **500** → Stripe reintenta. Devolver 200 con error ignorado hace que Stripe crea entrega exitosa y NO reintente, perdiendo pagos en silencio.

**Stripe MCP solo opera en TEST mode** (la sesión OAuth del `.mcp.json` está scope test). Para precios LIVE, crear en dashboard live o copiar vía wizard "Copia desde test" al activar la cuenta (copia Productos + Billing/Customer Portal config; NO copia webhooks).

**Stripe MX minimum charge = $10 MXN.** No precios bajo eso. IVA: precios actuales son inclusive ($39 / $299); Stripe Tax no está activado (declarar con contador).
