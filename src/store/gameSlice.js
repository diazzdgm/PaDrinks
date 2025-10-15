import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Estado del juego
  gameStatus: 'lobby', // 'lobby', 'playing', 'paused', 'finished'
  gameMode: 'classic',
  currentRound: 0,
  totalRounds: 50, // Rondas totales de la partida
  maxRounds: 50, // Máximo de rondas configuradas

  // Dinámica actual
  currentDynamic: null,
  dynamicType: null,
  dynamicData: null,

  // Sistema de preguntas y dinámicas
  currentQuestion: null,
  availableDynamics: [],
  usedQuestions: {},
  lastDynamicId: null,
  questionsRemaining: 0,

  // Mention Challenge specific state (per dynamic tracking)
  mentionChallengeTracking: {},

  // Paired Challenge specific state (tracking per dynamic: arm_wrestling, rock_paper_scissors)
  pairedChallengeTracking: {},

  // Timer
  timer: 0,
  timerActive: false,

  // Configuraciones
  gameSettings: {
    maxPlayers: 10,
    minPlayers: 3,
    shotType: 'shot', // 'shot', 'half', 'sip'
    difficulty: 'normal',
    playMethod: 'single', // 'single', 'multiple'
    connectionType: 'wifi', // 'wifi', 'bluetooth'
  },

  // Estado de pausa/configuración
  gamePhase: 'waiting', // 'waiting', 'playing', 'paused', 'finished', 'extending'
  isConfigModalOpen: false,

  // Estadísticas temporales
  roundHistory: [],
  gameStartTime: null,
  gameEndTime: null,

  // GameEngine state sync
  gameEngineState: null,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameStatus: (state, action) => {
      state.gameStatus = action.payload;
    },
    
    setGameMode: (state, action) => {
      state.gameMode = action.payload;
    },
    
    setGameSettings: (state, action) => {
      state.gameSettings = { ...state.gameSettings, ...action.payload };
    },
    
    startGame: (state, action) => {
      const { gameEngineState, question } = action.payload || {};

      state.gameStatus = 'playing';
      state.gamePhase = 'playing';
      state.currentRound = 1;
      state.gameStartTime = Date.now();
      state.roundHistory = [];
      state.currentQuestion = question || null;
      state.mentionChallengeTracking = {};
      state.pairedChallengeTracking = {};

      if (gameEngineState) {
        state.gameEngineState = gameEngineState;
        state.questionsRemaining = gameEngineState.questionsRemaining || 0;
      }
    },

    nextRound: (state, action) => {
      const { gameEngineState, question } = action.payload || {};

      state.currentRound += 1;
      state.currentQuestion = question || null;

      if (gameEngineState) {
        state.gameEngineState = gameEngineState;
        state.questionsRemaining = gameEngineState.questionsRemaining || 0;
        state.totalRounds = gameEngineState.totalRounds || state.totalRounds;
      }
    },

    setCurrentQuestion: (state, action) => {
      state.currentQuestion = action.payload;
    },

    setMentionChallengePlayer: (state, action) => {
      const { dynamicId, player, usedPlayerIds } = action.payload;
      if (!state.mentionChallengeTracking[dynamicId]) {
        state.mentionChallengeTracking[dynamicId] = {
          lastPlayer: null,
          usedPlayerIds: []
        };
      }
      state.mentionChallengeTracking[dynamicId].lastPlayer = player;
      state.mentionChallengeTracking[dynamicId].usedPlayerIds = usedPlayerIds;
    },

    addPairedChallengeParticipants: (state, action) => {
      const { dynamicId, player1Id, player2Id } = action.payload;
      if (!state.pairedChallengeTracking[dynamicId]) {
        state.pairedChallengeTracking[dynamicId] = [];
      }
      if (!state.pairedChallengeTracking[dynamicId].includes(player1Id)) {
        state.pairedChallengeTracking[dynamicId].push(player1Id);
      }
      if (!state.pairedChallengeTracking[dynamicId].includes(player2Id)) {
        state.pairedChallengeTracking[dynamicId].push(player2Id);
      }
    },

    removePairedChallengeParticipant: (state, action) => {
      const playerId = action.payload;
      Object.keys(state.pairedChallengeTracking).forEach(dynamicId => {
        state.pairedChallengeTracking[dynamicId] = state.pairedChallengeTracking[dynamicId].filter(
          id => String(id) !== String(playerId)
        );
      });
    },

    resetPairedChallengeParticipants: (state) => {
      state.pairedChallengeTracking = {};
    },

    resetPairedChallengeForDynamic: (state, action) => {
      const dynamicId = action.payload;
      if (state.pairedChallengeTracking[dynamicId]) {
        state.pairedChallengeTracking[dynamicId] = [];
      }
    },

    setCurrentDynamic: (state, action) => {
      state.currentDynamic = action.payload.name;
      state.dynamicType = action.payload.type;
      state.dynamicData = action.payload.data;
    },

    updateGameEngineState: (state, action) => {
      const gameEngineState = action.payload;
      state.gameEngineState = gameEngineState;

      if (gameEngineState) {
        state.currentRound = gameEngineState.currentRound || state.currentRound;
        state.totalRounds = gameEngineState.totalRounds || state.totalRounds;
        state.gamePhase = gameEngineState.gamePhase || state.gamePhase;
        state.questionsRemaining = gameEngineState.questionsRemaining || 0;
        state.currentQuestion = gameEngineState.currentQuestion || null;
      }
    },

    pauseGame: (state) => {
      state.gameStatus = 'paused';
      state.gamePhase = 'paused';
    },

    resumeGame: (state) => {
      state.gameStatus = 'playing';
      state.gamePhase = 'playing';
    },

    setConfigModalOpen: (state, action) => {
      state.isConfigModalOpen = action.payload;
      if (action.payload) {
        state.gamePhase = 'paused';
      } else if (state.gameStatus === 'playing') {
        state.gamePhase = 'playing';
      }
    },

    extendGame: (state, action) => {
      const { newTotalRounds, gameEngineState } = action.payload;
      state.totalRounds = newTotalRounds;
      state.maxRounds = newTotalRounds;

      if (gameEngineState) {
        state.gameEngineState = gameEngineState;
        state.questionsRemaining = gameEngineState.questionsRemaining || 0;
        state.currentQuestion = gameEngineState.currentQuestion || null;
      }
    },
    
    setTimer: (state, action) => {
      state.timer = action.payload;
    },
    
    startTimer: (state) => {
      state.timerActive = true;
    },
    
    stopTimer: (state) => {
      state.timerActive = false;
    },
    
    addRoundToHistory: (state, action) => {
      state.roundHistory.push({
        round: state.currentRound,
        dynamic: state.currentDynamic,
        result: action.payload,
        timestamp: Date.now(),
      });
    },
    
    endGame: (state, action) => {
      const { gameStats } = action.payload || {};

      state.gameStatus = 'finished';
      state.gamePhase = 'finished';
      state.gameEndTime = Date.now();

      if (gameStats) {
        state.gameStats = gameStats;
      }
    },

    resetGame: (state) => {
      return { ...initialState };
    },
  },
});

export const {
  setGameStatus,
  setGameMode,
  setGameSettings,
  startGame,
  nextRound,
  setCurrentQuestion,
  setMentionChallengePlayer,
  addPairedChallengeParticipants,
  removePairedChallengeParticipant,
  resetPairedChallengeParticipants,
  resetPairedChallengeForDynamic,
  setCurrentDynamic,
  updateGameEngineState,
  pauseGame,
  resumeGame,
  setConfigModalOpen,
  extendGame,
  setTimer,
  startTimer,
  stopTimer,
  addRoundToHistory,
  endGame,
  resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;
