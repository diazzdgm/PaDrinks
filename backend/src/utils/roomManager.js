const NodeCache = require('node-cache');
const Room = require('../models/Room');
const codeGenerator = require('./codeGenerator');

/**
 * Gestor central de salas de juego
 */
class RoomManager {
  constructor() {
    // Cache para salas activas (TTL: 2 horas)
    this.rooms = new NodeCache({ 
      stdTTL: 7200,
      checkperiod: 300, // Verificar expiración cada 5 minutos
      useClones: false
    });

    // Mapeo de socketId -> roomId para búsqueda rápida
    this.socketToRoom = new Map();

    // Configurar limpieza automática
    this.setupCleanupInterval();
    
    // Event listeners para cache
    this.rooms.on('expired', (key, value) => {
      this.cleanupRoom(key, 'expired');
    });
  }

  /**
   * Crear nueva sala
   * @param {string} hostSocketId - Socket ID del host
   * @param {object} settings - Configuración de la sala
   * @returns {Room} Nueva sala creada
   */
  createRoom(hostSocketId, settings = {}) {
    // Generar código único
    const roomCode = codeGenerator.generateRoomCode();
    
    // Crear nueva sala
    const room = new Room(hostSocketId, settings);
    room.id = roomCode; // Usar código generado
    
    // Guardar en cache
    this.rooms.set(roomCode, room);
    this.socketToRoom.set(hostSocketId, roomCode);
    
    console.log(`🎮 New room created: ${roomCode} by ${hostSocketId}`);
    
    return room;
  }

  /**
   * Obtener sala por código
   * @param {string} roomCode - Código de la sala
   * @returns {Room|null} Sala encontrada o null
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Obtener sala por socket ID
   * @param {string} socketId - Socket ID del jugador
   * @returns {Room|null} Sala encontrada o null
   */
  getRoomBySocketId(socketId) {
    const roomCode = this.socketToRoom.get(socketId);
    return roomCode ? this.getRoom(roomCode) : null;
  }

  /**
   * Unirse a una sala
   * @param {string} roomCode - Código de la sala
   * @param {string} socketId - Socket ID del jugador
   * @param {object} playerData - Datos del jugador
   * @returns {object} Resultado de la operación
   */
  joinRoom(roomCode, socketId, playerData = {}) {
    const room = this.getRoom(roomCode);
    
    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }
    
    if (room.isFull()) {
      throw new Error('ROOM_FULL');
    }
    
    // Verificar si es una reconexión
    const existingPlayer = room.getPlayerBySocketId(socketId);
    if (existingPlayer) {
      throw new Error('ALREADY_IN_ROOM');
    }
    
    // Crear nuevo jugador
    const Player = require('../models/Player');
    const player = new Player(socketId, playerData.nickname, playerData.avatar);
    
    // Agregar a la sala
    room.addPlayer(player);
    this.socketToRoom.set(socketId, roomCode);
    
    console.log(`👥 Player ${player.id} joined room ${roomCode}`);
    
    return {
      room,
      player,
      isReconnection: false
    };
  }

  /**
   * Salir de una sala
   * @param {string} socketId - Socket ID del jugador
   * @param {boolean} isVoluntary - Si la salida es voluntaria
   * @returns {object} Resultado de la operación
   */
  leaveRoom(socketId, isVoluntary = true) {
    const room = this.getRoomBySocketId(socketId);
    
    if (!room) {
      return { success: false, reason: 'NOT_IN_ROOM' };
    }
    
    const player = room.getPlayerBySocketId(socketId);
    if (!player) {
      return { success: false, reason: 'PLAYER_NOT_FOUND' };
    }
    
    // Remover jugador de la sala
    room.removePlayer(player.id, isVoluntary);
    this.socketToRoom.delete(socketId);
    
    console.log(`👋 Player ${player.id} left room ${room.id} (voluntary: ${isVoluntary})`);
    
    // Si la sala está vacía, eliminarla
    if (room.isEmpty()) {
      this.deleteRoom(room.id, 'empty');
    }
    
    return {
      success: true,
      room,
      player,
      wasHost: player.isHost
    };
  }

  /**
   * Intentar reconectar a una sala
   * @param {string} roomCode - Código de la sala
   * @param {string} playerId - ID del jugador
   * @param {string} newSocketId - Nuevo socket ID
   * @returns {object} Resultado de la reconexión
   */
  reconnectToRoom(roomCode, playerId, newSocketId) {
    const room = this.getRoom(roomCode);
    
    if (!room) {
      throw new Error('ROOM_NOT_FOUND');
    }
    
    try {
      const player = room.reconnectPlayer(playerId, newSocketId);
      this.socketToRoom.set(newSocketId, roomCode);
      
      console.log(`🔄 Player ${playerId} reconnected to room ${roomCode}`);
      
      return {
        room,
        player,
        isReconnection: true
      };
    } catch (error) {
      throw new Error(`RECONNECTION_FAILED: ${error.message}`);
    }
  }

  /**
   * Eliminar una sala
   * @param {string} roomCode - Código de la sala
   * @param {string} reason - Razón de eliminación
   */
  deleteRoom(roomCode, reason = 'manual') {
    const room = this.getRoom(roomCode);
    
    if (room) {
      // Limpiar mapeo de sockets
      room.players.forEach(player => {
        this.socketToRoom.delete(player.socketId);
      });
      
      // Liberar código para reutilización
      codeGenerator.releaseCode(roomCode);
      
      // Remover de cache
      this.rooms.del(roomCode);
      
      console.log(`🗑️ Room ${roomCode} deleted (${reason})`);
    }
  }

  /**
   * Limpiar sala
   * @param {string} roomCode - Código de la sala
   * @param {string} reason - Razón de limpieza
   */
  cleanupRoom(roomCode, reason) {
    console.log(`🧹 Cleaning up room ${roomCode} (${reason})`);
    this.deleteRoom(roomCode, reason);
  }

  /**
   * Configurar intervalo de limpieza automática
   */
  setupCleanupInterval() {
    // Ejecutar limpieza cada 10 minutos
    setInterval(() => {
      this.performAutomaticCleanup();
    }, 600000);
  }

  /**
   * Realizar limpieza automática de salas inactivas
   */
  performAutomaticCleanup() {
    const roomCodes = this.rooms.keys();
    let cleanedCount = 0;
    
    roomCodes.forEach(roomCode => {
      const room = this.getRoom(roomCode);
      if (room && room.shouldCleanup()) {
        this.deleteRoom(roomCode, 'inactive');
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 Automatic cleanup: removed ${cleanedCount} inactive rooms`);
    }
  }

  /**
   * Obtener estadísticas del gestor de salas
   * @returns {object} Estadísticas
   */
  getStats() {
    const rooms = this.rooms.keys();
    const totalPlayers = rooms.reduce((total, roomCode) => {
      const room = this.getRoom(roomCode);
      return total + (room ? room.players.size : 0);
    }, 0);
    
    return {
      totalRooms: rooms.length,
      totalPlayers,
      socketMappings: this.socketToRoom.size,
      codeStats: codeGenerator.getStats(),
      cacheStats: this.rooms.getStats()
    };
  }

  /**
   * Obtener lista de todas las salas (para debugging)
   * @returns {array} Lista de salas
   */
  getAllRooms() {
    const roomCodes = this.rooms.keys();
    return roomCodes.map(roomCode => {
      const room = this.getRoom(roomCode);
      return room ? room.toClientObject() : null;
    }).filter(Boolean);
  }
}

// Exportar instancia singleton
module.exports = new RoomManager();