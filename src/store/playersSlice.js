import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  playersList: [],
  currentHost: null,
  currentPlayer: null, // ID del jugador local
  
  // Puntuaciones
  playerScores: {}, // { playerId: shotCount }
  playerStats: {}, // { playerId: { votes: 0, powers: 0, ... } }
  
  // Configuración
  maxPlayers: 10,
  minPlayers: 3,
};

const playersSlice = createSlice({
  name: 'players',
  initialState,
  reducers: {
    addPlayer: (state, action) => {
      const player = {
        id: action.payload.id,
        name: action.payload.name,
        avatar: action.payload.avatar,
        gender: action.payload.gender,
        isHost: action.payload.isHost || false,
        isConnected: true,
        joinedAt: Date.now(),
      };
      
      state.playersList.push(player);
      
      // Inicializar puntuación
      state.playerScores[player.id] = 0;
      state.playerStats[player.id] = {
        votes: 0,
        powers: 0,
        roundsWon: 0,
        roundsLost: 0,
      };
      
      // Establecer host si es el primero
      if (state.playersList.length === 1) {
        state.currentHost = player.id;
      }
    },
    
    removePlayer: (state, action) => {
      const playerId = action.payload;
      state.playersList = state.playersList.filter(p => p.id !== playerId);
      delete state.playerScores[playerId];
      delete state.playerStats[playerId];
      
      // Si se va el host, asignar nuevo host
      if (state.currentHost === playerId && state.playersList.length > 0) {
        state.currentHost = state.playersList[0].id;
        state.playersList[0].isHost = true;
      }
    },
    
    updatePlayer: (state, action) => {
      const { id, ...updates } = action.payload;
      const playerIndex = state.playersList.findIndex(p => p.id === id);
      if (playerIndex !== -1) {
        state.playersList[playerIndex] = { ...state.playersList[playerIndex], ...updates };
      }
    },
    
    setCurrentPlayer: (state, action) => {
      state.currentPlayer = action.payload;
    },
    
    addShot: (state, action) => {
      const { playerId, count = 1 } = action.payload;
      if (state.playerScores[playerId] !== undefined) {
        state.playerScores[playerId] += count;
        state.playerStats[playerId].roundsLost += 1;
      }
    },
    
    addVote: (state, action) => {
      const { playerId } = action.payload;
      if (state.playerStats[playerId]) {
        state.playerStats[playerId].votes += 1;
      }
    },
    
    usePower: (state, action) => {
      const { playerId } = action.payload;
      if (state.playerStats[playerId]) {
        state.playerStats[playerId].powers += 1;
      }
    },
    
    setPlayerConnection: (state, action) => {
      const { playerId, isConnected } = action.payload;
      const player = state.playersList.find(p => p.id === playerId);
      if (player) {
        player.isConnected = isConnected;
      }
    },
    
    resetPlayerStats: (state) => {
      // Resetear puntuaciones pero mantener jugadores
      state.playerScores = {};
      state.playerStats = {};
      state.playersList.forEach(player => {
        state.playerScores[player.id] = 0;
        state.playerStats[player.id] = {
          votes: 0,
          powers: 0,
          roundsWon: 0,
          roundsLost: 0,
        };
      });
    },
    
    clearAllPlayers: (state) => {
      return { ...initialState };
    },
  },
});

export const {
  addPlayer,
  removePlayer,
  updatePlayer,
  setCurrentPlayer,
  addShot,
  addVote,
  usePower,
  setPlayerConnection,
  resetPlayerStats,
  clearAllPlayers,
} = playersSlice.actions;

export default playersSlice.reducer;
