import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Tipo de conexión
  connectionType: 'socket', // 'bluetooth', 'wifi', 'socket', 'offline'
  
  // Estado de conexión Socket.IO
  isConnected: false,
  isConnecting: false,
  socketId: null,
  serverUrl: 'http://localhost:3001',
  
  // Estado de sala
  isHost: false,
  roomCode: null,
  currentRoom: null,
  currentPlayer: null,
  
  // Dispositivos (para futuras implementaciones Bluetooth/WiFi)
  availableDevices: [],
  connectedDevices: [],
  
  // Datos de red
  networkInfo: null,
  
  // Estados de UI
  isScanning: false,
  connectionError: null,
  
  // Configuración
  settings: {
    autoReconnect: true,
    connectionTimeout: 30000, // 30 segundos
    maxRetries: 3,
    heartbeatInterval: 30000, // 30 segundos
  },
  
  // Estadísticas de conexión
  reconnectAttempts: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnectionType: (state, action) => {
      state.connectionType = action.payload;
    },
    
    // Socket.IO connection actions
    setSocketConnected: (state, action) => {
      state.isConnected = action.payload.connected;
      state.socketId = action.payload.socketId || null;
      state.isConnecting = false;
      state.connectionError = null;
      
      if (action.payload.connected) {
        state.lastConnectedAt = new Date().toISOString();
        state.reconnectAttempts = 0;
      } else {
        state.lastDisconnectedAt = new Date().toISOString();
        state.socketId = null;
      }
    },
    
    setSocketConnecting: (state, action) => {
      state.isConnecting = action.payload;
      if (action.payload) {
        state.connectionError = null;
      }
    },
    
    setSocketId: (state, action) => {
      state.socketId = action.payload;
    },
    
    setServerUrl: (state, action) => {
      state.serverUrl = action.payload;
    },
    
    // Room actions
    setRoomData: (state, action) => {
      const { room, player, isHost } = action.payload;
      state.currentRoom = room;
      state.currentPlayer = player;
      state.isHost = isHost;
      state.roomCode = room?.id || null;
    },
    
    clearRoomData: (state) => {
      state.currentRoom = null;
      state.currentPlayer = null;
      state.isHost = false;
      state.roomCode = null;
    },
    
    updateRoomState: (state, action) => {
      if (state.currentRoom) {
        state.currentRoom = { ...state.currentRoom, ...action.payload };
      }
    },
    
    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
      if (!action.payload) {
        state.connectedDevices = [];
      }
    },
    
    setIsHost: (state, action) => {
      state.isHost = action.payload;
    },
    
    setRoomCode: (state, action) => {
      state.roomCode = action.payload;
    },
    
    startScanning: (state) => {
      state.isScanning = true;
      state.connectionError = null;
    },
    
    stopScanning: (state) => {
      state.isScanning = false;
    },
    
    setAvailableDevices: (state, action) => {
      state.availableDevices = action.payload;
    },
    
    addAvailableDevice: (state, action) => {
      const device = action.payload;
      const exists = state.availableDevices.find(d => d.id === device.id);
      if (!exists) {
        state.availableDevices.push(device);
      }
    },
    
    setConnectedDevices: (state, action) => {
      state.connectedDevices = action.payload;
    },
    
    addConnectedDevice: (state, action) => {
      const device = action.payload;
      const exists = state.connectedDevices.find(d => d.id === device.id);
      if (!exists) {
        state.connectedDevices.push(device);
      }
    },
    
    removeConnectedDevice: (state, action) => {
      const deviceId = action.payload;
      state.connectedDevices = state.connectedDevices.filter(d => d.id !== deviceId);
    },
    
    setConnecting: (state, action) => {
      state.isConnecting = action.payload;
    },
    
    setConnectionError: (state, action) => {
      state.connectionError = action.payload;
      state.isConnecting = false;
    },
    
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1;
    },
    
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },
    
    setNetworkInfo: (state, action) => {
      state.networkInfo = action.payload;
    },
    
    resetConnection: (state) => {
      return { ...initialState };
    },
  },
});

export const {
  // General connection
  setConnectionType,
  setConnectionStatus,
  setIsHost,
  setRoomCode,
  
  // Socket.IO specific
  setSocketConnected,
  setSocketConnecting,
  setSocketId,
  setServerUrl,
  
  // Room management
  setRoomData,
  clearRoomData,
  updateRoomState,
  
  // Device management (for future use)
  startScanning,
  stopScanning,
  setAvailableDevices,
  addAvailableDevice,
  setConnectedDevices,
  addConnectedDevice,
  removeConnectedDevice,
  setConnecting,
  
  // Error and network
  setConnectionError,
  setNetworkInfo,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  
  // Reset
  resetConnection,
} = connectionSlice.actions;

export default connectionSlice.reducer;
