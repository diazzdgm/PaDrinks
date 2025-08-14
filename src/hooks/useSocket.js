import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import SocketService from '../services/SocketService';
import RoomService from '../services/RoomService';

/**
 * Hook personalizado para gestión de Socket.IO
 * Proporciona estado y funciones para conexión con el backend
 */
export const useSocket = () => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const dispatch = useDispatch();
  const mountedRef = useRef(true);

  // Estado de conexión
  useEffect(() => {
    const handleConnection = (data) => {
      if (!mountedRef.current) return;
      
      setConnected(data.connected);
      setSocketId(data.socketId || null);
      
      if (data.connected) {
        setConnecting(false);
        setError(null);
      }
    };

    const handleError = (errorData) => {
      if (!mountedRef.current) return;
      
      setError(errorData.error);
      setConnecting(false);
    };

    // Registrar listeners
    SocketService.on('connection', handleConnection);
    SocketService.on('error', handleError);

    // Estado inicial
    setConnected(SocketService.connected);
    setSocketId(SocketService.socketId);

    // Cleanup
    return () => {
      mountedRef.current = false;
      SocketService.off('connection', handleConnection);
      SocketService.off('error', handleError);
    };
  }, []);

  /**
   * Conectar al servidor
   */
  const connect = useCallback(async (serverUrl = null) => {
    try {
      setConnecting(true);
      setError(null);
      
      await SocketService.connect(serverUrl);
      
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
        setConnecting(false);
      }
      throw error;
    }
  }, []);

  /**
   * Desconectar del servidor
   */
  const disconnect = useCallback(() => {
    SocketService.disconnect();
    setConnected(false);
    setConnecting(false);
    setSocketId(null);
    setError(null);
  }, []);

  /**
   * Configurar URL del servidor
   */
  const setServerUrl = useCallback((url) => {
    SocketService.setServerUrl(url);
  }, []);

  return {
    connected,
    connecting,
    error,
    socketId,
    connect,
    disconnect,
    setServerUrl
  };
};

/**
 * Hook para gestión de salas de juego
 */
export const useRoom = () => {
  const [room, setRoom] = useState(null);
  const [player, setPlayer] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState('lobby');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const mountedRef = useRef(true);

  // Actualizar estado de la sala
  const updateRoomState = useCallback(() => {
    if (!mountedRef.current) return;
    
    const currentState = RoomService.getCurrentRoomState();
    setRoom(currentState.room);
    setPlayer(currentState.player);
    setIsHost(currentState.isHost);
    
    if (currentState.room) {
      setPlayers(currentState.room.players || []);
      setGameState(currentState.room.gameState || 'lobby');
    }
  }, []);

  // Event listeners para actualizaciones de sala
  useEffect(() => {
    const handleRoomCreated = (data) => {
      if (!mountedRef.current) return;
      updateRoomState();
    };

    const handlePlayerJoined = (data) => {
      if (!mountedRef.current) return;
      updateRoomState();
    };

    const handlePlayerLeft = (data) => {
      if (!mountedRef.current) return;
      updateRoomState();
    };

    const handlePlayerDisconnected = (data) => {
      if (!mountedRef.current) return;
      updateRoomState();
    };

    const handlePlayerReconnected = (data) => {
      if (!mountedRef.current) return;
      updateRoomState();
    };

    const handleGameStarted = (data) => {
      if (!mountedRef.current) return;
      setGameState('playing');
      updateRoomState();
    };

    const handleGamePaused = (data) => {
      if (!mountedRef.current) return;
      setGameState('paused');
      updateRoomState();
    };

    const handleGameResumed = (data) => {
      if (!mountedRef.current) return;
      setGameState('playing');
      updateRoomState();
    };

    const handlePlayerKicked = (data) => {
      if (!mountedRef.current) return;
      updateRoomState();
    };

    const handleKicked = (data) => {
      if (!mountedRef.current) return;
      setRoom(null);
      setPlayer(null);
      setIsHost(false);
      setPlayers([]);
      setGameState('lobby');
      setError(`Has sido expulsado: ${data.reason}`);
    };

    // Registrar todos los listeners
    RoomService.onRoomEvent('roomCreated', handleRoomCreated);
    RoomService.onRoomEvent('playerJoined', handlePlayerJoined);
    RoomService.onRoomEvent('playerLeft', handlePlayerLeft);
    RoomService.onRoomEvent('playerDisconnected', handlePlayerDisconnected);
    RoomService.onRoomEvent('playerReconnected', handlePlayerReconnected);
    RoomService.onRoomEvent('gameStarted', handleGameStarted);
    RoomService.onRoomEvent('gamePaused', handleGamePaused);
    RoomService.onRoomEvent('gameResumed', handleGameResumed);
    RoomService.onRoomEvent('playerKicked', handlePlayerKicked);
    RoomService.onRoomEvent('kicked', handleKicked);

    // Estado inicial
    updateRoomState();

    // Cleanup
    return () => {
      mountedRef.current = false;
      RoomService.offRoomEvent('roomCreated', handleRoomCreated);
      RoomService.offRoomEvent('playerJoined', handlePlayerJoined);
      RoomService.offRoomEvent('playerLeft', handlePlayerLeft);
      RoomService.offRoomEvent('playerDisconnected', handlePlayerDisconnected);
      RoomService.offRoomEvent('playerReconnected', handlePlayerReconnected);
      RoomService.offRoomEvent('gameStarted', handleGameStarted);
      RoomService.offRoomEvent('gamePaused', handleGamePaused);
      RoomService.offRoomEvent('gameResumed', handleGameResumed);
      RoomService.offRoomEvent('playerKicked', handlePlayerKicked);
      RoomService.offRoomEvent('kicked', handleKicked);
    };
  }, [updateRoomState]);

  /**
   * Crear nueva sala
   */
  const createRoom = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await RoomService.createRoom(options);
      
      if (mountedRef.current) {
        updateRoomState();
        setLoading(false);
      }
      
      return result;
      
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
        setLoading(false);
      }
      throw error;
    }
  }, [updateRoomState]);

  /**
   * Unirse a sala existente
   */
  const joinRoom = useCallback(async (roomCode, playerData = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await RoomService.joinRoom(roomCode, playerData);
      
      if (mountedRef.current) {
        updateRoomState();
        setLoading(false);
      }
      
      return result;
      
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
        setLoading(false);
      }
      throw error;
    }
  }, [updateRoomState]);

  /**
   * Intentar reconexión automática
   */
  const attemptReconnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await RoomService.attemptReconnection();
      
      if (mountedRef.current) {
        if (result && result.success) {
          updateRoomState();
        }
        setLoading(false);
      }
      
      return result;
      
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
        setLoading(false);
      }
      throw error;
    }
  }, [updateRoomState]);

  /**
   * Salir de la sala
   */
  const leaveRoom = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await RoomService.leaveRoom();
      
      if (mountedRef.current) {
        setRoom(null);
        setPlayer(null);
        setIsHost(false);
        setPlayers([]);
        setGameState('lobby');
        setLoading(false);
      }
      
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
        setLoading(false);
      }
      throw error;
    }
  }, []);

  /**
   * Iniciar juego (solo host)
   */
  const startGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await RoomService.startGame();
      
      if (mountedRef.current) {
        setLoading(false);
      }
      
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
        setLoading(false);
      }
      throw error;
    }
  }, []);

  /**
   * Expulsar jugador (solo host)
   */
  const kickPlayer = useCallback(async (playerId, reason) => {
    try {
      setLoading(true);
      setError(null);
      
      await RoomService.kickPlayer(playerId, reason);
      
      if (mountedRef.current) {
        setLoading(false);
      }
      
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
        setLoading(false);
      }
      throw error;
    }
  }, []);

  /**
   * Enviar acción de juego
   */
  const sendGameAction = useCallback(async (action, data = {}) => {
    try {
      await RoomService.sendGameAction(action, data);
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
      }
      throw error;
    }
  }, []);

  /**
   * Validar código de sala
   */
  const isValidRoomCode = useCallback((code) => {
    return RoomService.isValidRoomCode(code);
  }, []);

  /**
   * Generar datos para QR
   */
  const generateQRData = useCallback((roomCode, hostIp = null) => {
    return RoomService.generateQRData(roomCode, hostIp);
  }, []);

  /**
   * Parsear datos de QR
   */
  const parseQRData = useCallback((qrString) => {
    return RoomService.parseQRData(qrString);
  }, []);

  /**
   * Limpiar error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estado
    room,
    player,
    isHost,
    players,
    gameState,
    loading,
    error,
    
    // Acciones
    createRoom,
    joinRoom,
    leaveRoom,
    attemptReconnection,
    startGame,
    kickPlayer,
    sendGameAction,
    
    // Utilidades
    isValidRoomCode,
    generateQRData,
    parseQRData,
    clearError,
    
    // Estado computado
    inRoom: !!room,
    isPlaying: gameState === 'playing',
    isPaused: gameState === 'paused',
    playerCount: players.length
  };
};

/**
 * Hook para eventos de juego en tiempo real
 */
export const useGameEvents = (callback) => {
  const mountedRef = useRef(true);

  useEffect(() => {
    const handleGameAction = (data) => {
      if (!mountedRef.current) return;
      if (callback && typeof callback === 'function') {
        callback('gameAction', data);
      }
    };

    const handleGameStarted = (data) => {
      if (!mountedRef.current) return;
      if (callback && typeof callback === 'function') {
        callback('gameStarted', data);
      }
    };

    const handleGamePaused = (data) => {
      if (!mountedRef.current) return;
      if (callback && typeof callback === 'function') {
        callback('gamePaused', data);
      }
    };

    const handleGameResumed = (data) => {
      if (!mountedRef.current) return;
      if (callback && typeof callback === 'function') {
        callback('gameResumed', data);
      }
    };

    // Registrar listeners
    RoomService.onRoomEvent('gameActionReceived', handleGameAction);
    RoomService.onRoomEvent('gameStarted', handleGameStarted);
    RoomService.onRoomEvent('gamePaused', handleGamePaused);
    RoomService.onRoomEvent('gameResumed', handleGameResumed);

    // Cleanup
    return () => {
      mountedRef.current = false;
      RoomService.offRoomEvent('gameActionReceived', handleGameAction);
      RoomService.offRoomEvent('gameStarted', handleGameStarted);
      RoomService.offRoomEvent('gamePaused', handleGamePaused);
      RoomService.offRoomEvent('gameResumed', handleGameResumed);
    };
  }, [callback]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
};