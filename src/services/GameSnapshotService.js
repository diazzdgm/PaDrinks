import { Platform } from 'react-native';

const STORAGE_KEY = 'padrinks_game_snapshot_v1';
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
const SCHEMA_VERSION = 1;

const GameSnapshotService = {
  saveSnapshot(reduxState, gameEngineState, gameScreenLocalState) {
    if (typeof window === 'undefined' || Platform.OS !== 'web') return;
    try {
      const gamePhase = reduxState?.game?.gamePhase;
      if (gamePhase !== 'playing' && gamePhase !== 'paused') return;

      let resolvedGameScreen = gameScreenLocalState;
      if (resolvedGameScreen === null) {
        const existing = this.loadSnapshot();
        resolvedGameScreen = existing ? existing.gameScreen : null;
      }

      if (resolvedGameScreen && resolvedGameScreen.skippedPairedDynamicIds instanceof Set) {
        resolvedGameScreen = {
          ...resolvedGameScreen,
          skippedPairedDynamicIds: Array.from(resolvedGameScreen.skippedPairedDynamicIds),
        };
      }

      const snapshot = {
        version: SCHEMA_VERSION,
        savedAt: Date.now(),
        redux: {
          game: reduxState.game,
          players: {
            playersList: reduxState.players.playersList,
            currentPlayer: reduxState.players.currentPlayer,
            currentHost: reduxState.players.currentHost,
            playerScores: reduxState.players.playerScores,
            playerStats: reduxState.players.playerStats,
          },
        },
        engine: gameEngineState,
        gameScreen: resolvedGameScreen,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      this.clearSnapshot();
    }
  },

  loadSnapshot() {
    if (typeof window === 'undefined' || Platform.OS !== 'web') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const snapshot = JSON.parse(raw);

      if (snapshot.version !== SCHEMA_VERSION) {
        this.clearSnapshot();
        return null;
      }

      return snapshot;
    } catch (e) {
      this.clearSnapshot();
      return null;
    }
  },

  clearSnapshot() {
    if (typeof window === 'undefined' || Platform.OS !== 'web') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  },

  hasValidSnapshot() {
    if (typeof window === 'undefined' || Platform.OS !== 'web') return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const snapshot = JSON.parse(raw);

      if (snapshot.version !== SCHEMA_VERSION) {
        this.clearSnapshot();
        return false;
      }

      if (!snapshot.savedAt || Date.now() - snapshot.savedAt > SNAPSHOT_TTL_MS) {
        this.clearSnapshot();
        return false;
      }

      const gamePhase = snapshot.redux?.game?.gamePhase;
      if (gamePhase !== 'playing' && gamePhase !== 'paused') {
        this.clearSnapshot();
        return false;
      }

      return true;
    } catch (e) {
      this.clearSnapshot();
      return false;
    }
  },
};

export default GameSnapshotService;
