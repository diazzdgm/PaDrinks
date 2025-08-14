import SocketService from './SocketService';

/**
 * Servicio para gestión de salas de juego
 * Wrapper de alto nivel sobre SocketService para operaciones de sala
 */
class RoomService {
  constructor() {
    this.socketService = SocketService;
  }

  /**
   * Crear nueva sala de juego
   * @param {object} options - Opciones de creación
   * @returns {Promise<object>} - Datos de la sala creada
   */
  async createRoom(options = {}) {
    const {
      maxPlayers = 8,
      nickname = 'Host',
      avatar = null,
      gameType = 'classic',
      settings = {}
    } = options;

    try {
      // Asegurar conexión
      if (!this.socketService.connected) {
        await this.socketService.connect();
      }

      // Configuración de la sala
      const roomSettings = {
        maxPlayers,
        gameType,
        ...settings
      };

      // Datos del jugador host
      const playerData = {
        nickname,
        avatar
      };

      // Crear sala
      const result = await this.socketService.createRoom(roomSettings, playerData);
      
      console.log(`🏠 Sala creada exitosamente: ${result.room.id}`);
      
      return {
        success: true,
        room: result.room,
        player: result.player,
        roomCode: result.room.id,
        isHost: result.isHost
      };

    } catch (error) {
      console.error('❌ Error creando sala:', error.message);
      throw new Error(`No se pudo crear la sala: ${error.message}`);
    }
  }

  /**
   * Unirse a sala existente
   * @param {string} roomCode - Código de la sala
   * @param {object} playerData - Datos del jugador
   * @returns {Promise<object>} - Datos de unión a sala
   */
  async joinRoom(roomCode, playerData = {}) {
    const {
      nickname = 'Jugador',
      avatar = null
    } = playerData;

    try {
      // Validar código de sala
      if (!this.isValidRoomCode(roomCode)) {
        throw new Error('Código de sala inválido');
      }

      // Asegurar conexión
      if (!this.socketService.connected) {
        await this.socketService.connect();
      }

      // Preparar datos del jugador
      const player = {
        nickname,
        avatar
      };

      // Unirse a la sala
      const result = await this.socketService.joinRoom(roomCode, player);
      
      console.log(`👥 Se unió a la sala exitosamente: ${roomCode}`);
      
      return {
        success: true,
        room: result.room,
        player: result.player,
        roomCode: result.room.id,
        isHost: result.isHost,
        players: result.room.players
      };

    } catch (error) {
      console.error('❌ Error uniéndose a sala:', error.message);
      
      // Proporcionar mensajes de error más específicos
      let userMessage = error.message;
      if (error.message.includes('ROOM_NOT_FOUND')) {
        userMessage = 'Sala no encontrada. Verifica el código.';
      } else if (error.message.includes('ROOM_FULL')) {
        userMessage = 'La sala está llena. Intenta con otra sala.';
      } else if (error.message.includes('ALREADY_IN_ROOM')) {
        userMessage = 'Ya estás en una sala.';
      }
      
      throw new Error(userMessage);
    }
  }

  /**
   * Intentar reconexión a sala guardada
   * @returns {Promise<object|null>} - Datos de reconexión o null
   */
  async attemptReconnection() {
    try {
      // Cargar sesión guardada
      const session = await this.socketService.loadPlayerSession();
      
      if (!session || !session.playerId || !session.roomCode) {
        console.log('📱 No hay sesión guardada para reconectar');
        return null;
      }

      console.log(`🔄 Intentando reconectar a sala ${session.roomCode}...`);

      // Asegurar conexión
      if (!this.socketService.connected) {
        await this.socketService.connect();
      }

      // Intentar reconexión
      const result = await this.socketService.reconnectToRoom(
        session.roomCode,
        session.playerId,
        this.socketService.socketId
      );

      console.log('✅ Reconexión exitosa');
      
      return {
        success: true,
        room: result.room,
        player: result.player,
        roomCode: result.room.id,
        isHost: result.player.isHost,
        isReconnection: true
      };

    } catch (error) {
      console.error('❌ Error en reconexión:', error.message);
      
      // Limpiar sesión si la reconexión falla
      await this.socketService.clearPlayerSession();
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Salir de la sala actual
   * @returns {Promise<boolean>} - True si salió exitosamente
   */
  async leaveRoom() {
    try {
      if (!this.socketService.connected) {
        console.log('⚠️ No conectado, limpiando estado local');
        return true;
      }

      await this.socketService.leaveRoom();
      
      console.log('👋 Salió de la sala exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error saliendo de sala:', error.message);
      // Aún así limpiar estado local
      await this.socketService.clearPlayerSession();
      return false;
    }
  }

  /**
   * Iniciar juego (solo host)
   * @returns {Promise<boolean>} - True si inició exitosamente
   */
  async startGame() {
    try {
      if (!this.socketService.hostStatus) {
        throw new Error('Solo el host puede iniciar el juego');
      }

      if (!this.socketService.room || this.socketService.room.players.length < 2) {
        throw new Error('Se necesitan al menos 2 jugadores para iniciar');
      }

      await this.socketService.startGame();
      
      console.log('🎮 Juego iniciado exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error iniciando juego:', error.message);
      throw error;
    }
  }

  /**
   * Pausar juego (solo host)
   * @param {string} reason - Razón de la pausa
   * @returns {Promise<boolean>} - True si pausó exitosamente
   */
  async pauseGame(reason = 'Pausado por host') {
    try {
      if (!this.socketService.hostStatus) {
        throw new Error('Solo el host puede pausar el juego');
      }

      const result = await this.socketService.pauseGame(reason);
      
      console.log('⏸️ Juego pausado exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error pausando juego:', error.message);
      throw error;
    }
  }

  /**
   * Expulsar jugador (solo host)
   * @param {string} playerId - ID del jugador a expulsar
   * @param {string} reason - Razón de expulsión
   * @returns {Promise<boolean>} - True si expulsó exitosamente
   */
  async kickPlayer(playerId, reason = 'Expulsado por host') {
    try {
      if (!this.socketService.hostStatus) {
        throw new Error('Solo el host puede expulsar jugadores');
      }

      await this.socketService.kickPlayer(playerId, reason);
      
      console.log(`👟 Jugador ${playerId} expulsado exitosamente`);
      return true;

    } catch (error) {
      console.error('❌ Error expulsando jugador:', error.message);
      throw error;
    }
  }

  /**
   * Enviar acción de juego
   * @param {string} action - Tipo de acción
   * @param {object} data - Datos de la acción
   * @returns {Promise<boolean>} - True si envió exitosamente
   */
  async sendGameAction(action, data = {}) {
    try {
      await this.socketService.sendGameAction(action, data);
      
      console.log(`🎯 Acción enviada: ${action}`);
      return true;

    } catch (error) {
      console.error('❌ Error enviando acción:', error.message);
      throw error;
    }
  }

  /**
   * Validar código de sala
   * @param {string} code - Código a validar
   * @returns {boolean} - True si es válido
   */
  isValidRoomCode(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }
    
    // Debe ser exactamente 6 dígitos
    return /^\d{6}$/.test(code);
  }

  /**
   * Generar datos para QR code
   * @param {string} roomCode - Código de la sala
   * @param {string} hostIp - IP del host (opcional)
   * @returns {object} - Datos para QR
   */
  generateQRData(roomCode, hostIp = null) {
    return {
      type: 'padrinks_room',
      version: '1.0',
      roomCode: roomCode,
      serverUrl: this.socketService.serverConfig.url,
      hostIp: hostIp,
      timestamp: Date.now()
    };
  }

  /**
   * Parsear datos de QR code
   * @param {string} qrString - String del QR escaneado
   * @returns {object|null} - Datos parseados o null
   */
  parseQRData(qrString) {
    try {
      const data = JSON.parse(qrString);
      
      if (data.type !== 'padrinks_room' || !data.roomCode) {
        return null;
      }
      
      return {
        roomCode: data.roomCode,
        serverUrl: data.serverUrl,
        hostIp: data.hostIp,
        timestamp: data.timestamp
      };
      
    } catch (error) {
      console.error('❌ Error parseando QR:', error.message);
      return null;
    }
  }

  /**
   * Registrar listener para eventos de sala
   * @param {string} event - Nombre del evento
   * @param {function} callback - Función callback
   */
  onRoomEvent(event, callback) {
    this.socketService.on(event, callback);
  }

  /**
   * Remover listener de eventos
   * @param {string} event - Nombre del evento
   * @param {function} callback - Función callback
   */
  offRoomEvent(event, callback) {
    this.socketService.off(event, callback);
  }

  /**
   * Obtener estado actual de la sala
   * @returns {object|null} - Estado de la sala
   */
  getCurrentRoomState() {
    return {
      room: this.socketService.room,
      player: this.socketService.player,
      isHost: this.socketService.hostStatus,
      connected: this.socketService.connected,
      socketId: this.socketService.socketId
    };
  }

  /**
   * Obtener estadísticas del servidor
   * @returns {Promise<object>} - Estadísticas
   */
  async getServerStats() {
    try {
      const serverInfo = await this.socketService.getServerInfo();
      return serverInfo.stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error.message);
      throw error;
    }
  }

  /**
   * Configurar URL del servidor
   * @param {string} url - Nueva URL
   */
  setServerUrl(url) {
    this.socketService.setServerUrl(url);
  }

  /**
   * Verificar conectividad con el servidor
   * @returns {Promise<boolean>} - True si puede conectar
   */
  async testConnection() {
    try {
      if (!this.socketService.connected) {
        await this.socketService.connect();
      }
      
      await this.socketService.getServerInfo();
      return true;
      
    } catch (error) {
      console.error('❌ Test de conexión falló:', error.message);
      return false;
    }
  }
}

// Exportar instancia singleton
export default new RoomService();