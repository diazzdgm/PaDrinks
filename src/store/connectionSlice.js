import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Tipo de conexión
  connectionType: null, // 'bluetooth', 'wifi', 'offline'
  
  // Estado de conexión
  isConnected: false,
  isHost: false,
  roomCode: null,
  
  // Dispositivos
  availableDevices: [],
  connectedDevices: [],
  
  // Datos de red
  networkInfo: null,
  
  // Estados
  isScanning: false,
  isConnecting: false,
  connectionError: null,
  
  // Configuración
  settings: {
    autoReconnect: true,
    connectionTimeout: 30000, // 30 segundos
    maxRetries: 3,
  },
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnectionType: (state, action) => {
      state.connectionType = action.payload;
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
    
    setNetworkInfo: (state, action) => {
      state.networkInfo = action.payload;
    },
    
    resetConnection: (state) => {
      return { ...initialState };
    },
  },
});

export const {
  setConnectionType,
  setConnectionStatus,
  setIsHost,
  setRoomCode,
  startScanning,
  stopScanning,
  setAvailableDevices,
  addAvailableDevice,
  setConnectedDevices,
  addConnectedDevice,
  removeConnectedDevice,
  setConnecting,
  setConnectionError,
  setNetworkInfo,
  resetConnection,
} = connectionSlice.actions;

export default connectionSlice.reducer;
