import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import serverConfig from '../config/server';

/**
 * Servicio Socket.IO para PaDrinks
 * Maneja toda la comunicación con el backend
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.listeners = new Map();
    
    // Configuración del servidor
    this.serverConfig = {
      url: this.getServerUrl(), // Detectar automáticamente la URL correcta
      options: {
        transports: ['polling', 'websocket'], // polling primero para ngrok
        timeout: 30000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        maxHttpBufferSize: 1e8,
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 30000,
        // Configuración específica para ngrok
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true'
        }
      }
    };
    
    // Estado del jugador/sala
    this.currentPlayer = null;
    this.currentRoom = null;
    this.isHost = false;
  }

  /**
   * Detectar la URL correcta del servidor según el entorno
   * @returns {string} URL del servidor
   */
  getServerUrl() {
    return serverConfig.getServerUrl();
  }

  /**
   * Conectar al servidor
   * @param {string} serverUrl - URL del servidor (opcional)
   * @returns {Promise<boolean>} - True si conectó exitosamente
   */
  async connect(serverUrl = null) {
    if (this.isConnected) {
      console.log('🔌 Ya conectado al servidor');
      return true;
    }

    if (this.isConnecting) {
      console.log('🔌 Conexión en progreso...');
      return false;
    }

    try {
      this.isConnecting = true;
      
      // Usar URL personalizada si se proporciona
      const url = serverUrl || this.serverConfig.url;
      
      console.log(`🔌 Conectando a ${url}...`);
      
      this.socket = io(url, this.serverConfig.options);
      
      // Configurar eventos del socket
      this.setupSocketEvents();
      
      // Esperar conexión
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout de conexión'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          console.log(`✅ Conectado con ID: ${this.socket.id}`);
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          console.error('❌ Error de conexión:', error.message);
          reject(error);
        });
      });

    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Error conectando:', error.message);
      throw error;
    }
  }

  /**
   * Desconectar del servidor
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando...');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.currentPlayer = null;
    this.currentRoom = null;
    this.isHost = false;
    this.listeners.clear();
  }

  /**
   * Configurar eventos del socket
   */
  setupSocketEvents() {
    if (!this.socket) return;

    // Eventos de conexión
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log(`✅ Socket conectado: ${this.socket.id}`);
      this.emit('connection', { connected: true, socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log(`🔌 Socket desconectado: ${reason}`);
      this.emit('connection', { connected: false, reason });
      
      // Auto-reconectar si no fue intencional
      if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    });

    // Eventos de error
    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error.message);
      this.emit('error', { type: 'connection', error: error.message });
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.emit('error', { type: 'socket', error });
    });

    // Eventos de sala
    this.socket.on('roomCreated', (data) => {
      console.log('🏠 Sala creada:', data.room.id);
      this.currentRoom = data.room;
      this.currentPlayer = data.player;
      this.isHost = data.isHost;
      this.emit('roomCreated', data);
    });

    this.socket.on('playerJoined', (data) => {
      console.log('👤 Jugador se unió:', data.player.nickname);
      if (this.currentRoom) {
        this.currentRoom = data.room;
      }
      this.emit('playerJoined', data);
    });

    this.socket.on('playerLeft', (data) => {
      console.log('👋 Jugador salió:', data.player.nickname);
      if (this.currentRoom) {
        this.currentRoom = data.room;
      }
      this.emit('playerLeft', data);
    });

    this.socket.on('playerDisconnected', (data) => {
      console.log('🔌 Jugador desconectado:', data.player.nickname);
      this.emit('playerDisconnected', data);
    });

    this.socket.on('playerReconnected', (data) => {
      console.log('🔄 Jugador reconectado:', data.player.nickname);
      if (this.currentRoom) {
        this.currentRoom = data.room;
      }
      this.emit('playerReconnected', data);
    });

    // Eventos de juego
    this.socket.on('gameStarted', (data) => {
      console.log('🎮 Juego iniciado');
      if (this.currentRoom) {
        this.currentRoom.gameState = 'playing';
      }
      this.emit('gameStarted', data);
    });

    this.socket.on('gamePaused', (data) => {
      console.log('⏸️ Juego pausado:', data.reason);
      if (this.currentRoom) {
        this.currentRoom.gameState = 'paused';
      }
      this.emit('gamePaused', data);
    });

    this.socket.on('gameResumed', (data) => {
      console.log('▶️ Juego reanudado');
      if (this.currentRoom) {
        this.currentRoom.gameState = 'playing';
      }
      this.emit('gameResumed', data);
    });

    this.socket.on('gameActionReceived', (data) => {
      console.log(`🎯 Acción recibida: ${data.action}`);
      this.emit('gameActionReceived', data);
    });

    this.socket.on('playerKicked', (data) => {
      console.log('👟 Jugador expulsado:', data.kickedPlayer.nickname);
      this.emit('playerKicked', data);
    });

    this.socket.on('kicked', (data) => {
      console.log('❌ Has sido expulsado:', data.reason);
      this.currentRoom = null;
      this.currentPlayer = null;
      this.isHost = false;
      this.emit('kicked', data);
    });
  }

  /**
   * Intentar reconexión automática
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Máximo de intentos de reconexión alcanzado');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    
    console.log(`🔄 Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch((error) => {
          console.error('❌ Falló reconexión:', error.message);
        });
      }
    }, delay);
  }

  /**
   * Emitir evento a listeners registrados
   * @param {string} event - Nombre del evento
   * @param {any} data - Datos del evento
   */
  emit(event, data) {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ Error en listener de ${event}:`, error);
      }
    });
  }

  /**
   * Registrar listener para eventos
   * @param {string} event - Nombre del evento
   * @param {function} callback - Función callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remover listener
   * @param {string} event - Nombre del evento
   * @param {function} callback - Función callback a remover
   */
  off(event, callback) {
    const eventListeners = this.listeners.get(event) || [];
    const index = eventListeners.indexOf(callback);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  }

  /**
   * Crear nueva sala
   * @param {object} settings - Configuración de la sala
   * @param {object} playerData - Datos del jugador
   * @returns {Promise<object>} - Resultado de la operación
   */
  async createRoom(settings = {}, playerData = {}) {
    if (!this.isConnected) {
      throw new Error('No conectado al servidor');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('createRoom', { settings, playerData }, (response) => {
        if (response.success) {
          this.currentRoom = response.room;
          this.currentPlayer = response.player;
          this.isHost = response.isHost;
          
          // Guardar para reconexión
          this.savePlayerSession();
          
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Unirse a sala existente
   * @param {string} roomCode - Código de la sala
   * @param {object} playerData - Datos del jugador
   * @returns {Promise<object>} - Resultado de la operación
   */
  async joinRoom(roomCode, playerData = {}) {
    if (!this.isConnected) {
      throw new Error('No conectado al servidor');
    }

    console.log('🏠 SocketService.joinRoom - Enviando al backend:', {
      roomCode,
      playerData: {
        nickname: playerData.nickname,
        photoUri: playerData.photoUri,
        avatar: playerData.avatar,
        emoji: playerData.emoji,
        gender: playerData.gender,
        orientation: playerData.orientation
      }
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout joining room'));
      }, 30000); // Aumentado a 30 segundos
      
      this.socket.emit('joinRoom', { roomCode, playerData }, (response) => {
        clearTimeout(timeout);
        
        console.log('📨 SocketService.joinRoom - Respuesta del backend:', response);
        
        if (response && response.success) {
          this.currentRoom = response.room;
          this.currentPlayer = response.player;
          this.isHost = response.isHost;
          
          console.log('✅ SocketService - Sala actualizada:', {
            roomId: response.room.id,
            playersCount: response.room.players?.length,
            isHost: response.isHost
          });
          
          // Guardar para reconexión
          this.savePlayerSession();
          
          resolve(response);
        } else {
          console.error('❌ SocketService - Error del backend:', response?.error);
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }

  /**
   * Salir de la sala actual
   * @returns {Promise<object>} - Resultado de la operación
   */
  async leaveRoom() {
    if (!this.isConnected) {
      throw new Error('No conectado al servidor');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('leaveRoom', {}, (response) => {
        if (response.success) {
          this.currentRoom = null;
          this.currentPlayer = null;
          this.isHost = false;
          
          // Limpiar sesión guardada
          this.clearPlayerSession();
          
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Iniciar juego (solo host)
   * @returns {Promise<object>} - Resultado de la operación
   */
  async startGame() {
    if (!this.isConnected) {
      throw new Error('No conectado al servidor');
    }

    if (!this.isHost) {
      throw new Error('Solo el host puede iniciar el juego');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('startGame', {}, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Enviar acción de juego
   * @param {string} action - Tipo de acción
   * @param {object} data - Datos de la acción
   * @returns {Promise<object>} - Resultado de la operación
   */
  async sendGameAction(action, data = {}) {
    if (!this.isConnected) {
      throw new Error('No conectado al servidor');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('gameAction', { action, data }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Expulsar jugador (solo host)
   * @param {string} playerId - ID del jugador a expulsar
   * @param {string} reason - Razón de expulsión
   * @returns {Promise<object>} - Resultado de la operación
   */
  async kickPlayer(playerId, reason = 'Expulsado por host') {
    if (!this.isConnected) {
      throw new Error('No conectado al servidor');
    }

    if (!this.isHost) {
      throw new Error('Solo el host puede expulsar jugadores');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('kickPlayer', { playerId, reason }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Obtener información del servidor
   * @returns {Promise<object>} - Información del servidor
   */
  async getServerInfo() {
    if (!this.isConnected) {
      throw new Error('No conectado al servidor');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('getServerInfo', (serverInfo) => {
        resolve(serverInfo);
      });
    });
  }

  /**
   * Sincronizar estado del juego
   * @returns {Promise<object>} - Estado sincronizado
   */
  async syncGameState() {
    if (!this.isConnected) {
      throw new Error('No conectado al servidor');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('syncGameState', (response) => {
        if (response.success) {
          this.currentRoom = response.room;
          this.currentPlayer = response.player;
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Guardar sesión del jugador para reconexión
   */
  async savePlayerSession() {
    try {
      const sessionData = {
        playerId: this.currentPlayer?.id,
        roomCode: this.currentRoom?.id,
        nickname: this.currentPlayer?.nickname,
        isHost: this.isHost,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem('padrinks_session', JSON.stringify(sessionData));
      console.log('💾 Sesión guardada para reconexión');
    } catch (error) {
      console.error('❌ Error guardando sesión:', error);
    }
  }

  /**
   * Cargar sesión guardada
   * @returns {object|null} - Datos de sesión o null
   */
  async loadPlayerSession() {
    try {
      const sessionData = await AsyncStorage.getItem('padrinks_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        
        // Verificar que la sesión no sea muy antigua (30 minutos)
        const sessionAge = Date.now() - parsed.timestamp;
        if (sessionAge < 30 * 60 * 1000) {
          console.log('📱 Sesión cargada para reconexión');
          return parsed;
        } else {
          console.log('⏰ Sesión expirada, eliminando...');
          await this.clearPlayerSession();
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Error cargando sesión:', error);
      return null;
    }
  }

  /**
   * Limpiar sesión guardada
   */
  async clearPlayerSession() {
    try {
      await AsyncStorage.removeItem('padrinks_session');
      console.log('🗑️ Sesión limpiada');
    } catch (error) {
      console.error('❌ Error limpiando sesión:', error);
    }
  }

  /**
   * Getters para acceso al estado
   */
  get connected() {
    return this.isConnected;
  }

  get connecting() {
    return this.isConnecting;
  }

  get socketId() {
    return this.socket?.id || null;
  }

  get room() {
    return this.currentRoom;
  }

  get player() {
    return this.currentPlayer;
  }

  get hostStatus() {
    return this.isHost;
  }

  /**
   * Configurar URL del servidor (para desarrollo/producción)
   * @param {string} url - Nueva URL del servidor
   */
  setServerUrl(url) {
    this.serverConfig.url = url;
    console.log(`🔧 URL del servidor actualizada: ${url}`);
  }
}

// Exportar instancia singleton
export default new SocketService();