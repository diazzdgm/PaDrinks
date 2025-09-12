import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Estado del juego
  gameStatus: 'lobby', // 'lobby', 'playing', 'paused', 'finished'
  gameMode: 'classic',
  currentRound: 0,
  totalRounds: null, // null = infinito
  
  // Dinámica actual
  currentDynamic: null,
  dynamicType: null,
  dynamicData: null,
  
  // Timer
  timer: 0,
  timerActive: false,
  
  // Configuraciones
  gameSettings: {
    maxPlayers: 10,
    minPlayers: 3,
    shotType: 'shot', // 'shot', 'half', 'sip'
    difficulty: 'normal',
    playMethod: 'multiple', // 'single', 'multiple'
    connectionType: 'wifi', // 'wifi', 'bluetooth'
  },
  
  // Estadísticas temporales
  roundHistory: [],
  gameStartTime: null,
  gameEndTime: null,
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
    
    startGame: (state) => {
      state.gameStatus = 'playing';
      state.currentRound = 1;
      state.gameStartTime = Date.now();
      state.roundHistory = [];
    },
    
    nextRound: (state) => {
      state.currentRound += 1;
    },
    
    setCurrentDynamic: (state, action) => {
      state.currentDynamic = action.payload.name;
      state.dynamicType = action.payload.type;
      state.dynamicData = action.payload.data;
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
    
    endGame: (state) => {
      state.gameStatus = 'finished';
      state.gameEndTime = Date.now();
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
  setCurrentDynamic,
  setTimer,
  startTimer,
  stopTimer,
  addRoundToHistory,
  endGame,
  resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;
