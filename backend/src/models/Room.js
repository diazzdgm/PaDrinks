const { v4: uuidv4 } = require('uuid');

class Room {
  constructor(hostSocketId, settings = {}) {
    this.id = this.generateRoomCode();
    this.hostSocketId = hostSocketId;
    this.players = new Map(); // playerId -> Player object
    this.gameState = 'lobby'; // lobby, playing, paused, finished
    this.createdAt = new Date();
    this.lastActivity = new Date();
    
    // Configuración de la sala
    this.settings = {
      maxPlayers: settings.maxPlayers || 8,
      reconnectTimeout: settings.reconnectTimeout || 300000, // 5 minutos
      heartbeatInterval: settings.heartbeatInterval || 30000, // 30 segundos
      autoCleanup: settings.autoCleanup || true,
      inactivityTimeout: settings.inactivityTimeout || 1800000, // 30 minutos
      ...settings
    };

    // Slots reservados para reconexión
    this.disconnectedSlots = new Map(); // playerId -> { disconnectedAt, player }
  }

  // Generar código de sala de 6 dígitos
  generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Agregar jugador a la sala
  addPlayer(player) {
    if (this.players.size >= this.settings.maxPlayers) {
      throw new Error('Room is full');
    }
    
    // Si es el primer jugador, hacerlo host
    if (this.players.size === 0) {
      player.isHost = true;
      this.hostSocketId = player.socketId;
    }
    
    this.players.set(player.id, player);
    this.updateActivity();
    
    return player;
  }

  // Remover jugador de la sala
  removePlayer(playerId, isVoluntary = true) {
    const player = this.players.get(playerId);
    if (!player) return null;

    // Si el jugador era host, transferir a otro jugador
    if (player.isHost && this.players.size > 1) {
      this.transferHost();
    }

    // Si no es voluntario, reservar slot para reconexión
    if (!isVoluntary && this.gameState === 'playing') {
      this.reserveSlot(player);
    }

    this.players.delete(playerId);
    this.updateActivity();
    
    return player;
  }

  // Reservar slot para reconexión
  reserveSlot(player) {
    player.setDisconnected();
    this.disconnectedSlots.set(player.id, {
      disconnectedAt: new Date(),
      player: player
    });

    // Auto-cleanup del slot después del timeout
    setTimeout(() => {
      this.cleanupDisconnectedSlot(player.id);
    }, this.settings.reconnectTimeout);
  }

  // Limpiar slot desconectado
  cleanupDisconnectedSlot(playerId) {
    this.disconnectedSlots.delete(playerId);
  }

  // Reconectar jugador
  reconnectPlayer(playerId, newSocketId) {
    const slotData = this.disconnectedSlots.get(playerId);
    if (!slotData) {
      throw new Error('No reserved slot found for player');
    }

    const player = slotData.player;
    if (!player.canReconnect()) {
      this.cleanupDisconnectedSlot(playerId);
      throw new Error('Maximum reconnection attempts exceeded');
    }

    player.reconnect(newSocketId);
    this.players.set(playerId, player);
    this.disconnectedSlots.delete(playerId);
    this.updateActivity();

    return player;
  }

  // Transferir host a otro jugador
  transferHost() {
    // Encontrar el primer jugador que no sea el host actual
    const newHost = Array.from(this.players.values())
      .find(player => !player.isHost && player.status !== 'disconnected');
    
    if (newHost) {
      // Remover host del jugador actual
      this.players.forEach(player => {
        player.isHost = false;
      });
      
      // Asignar nuevo host
      newHost.isHost = true;
      this.hostSocketId = newHost.socketId;
      
      return newHost;
    }
    
    return null;
  }

  // Obtener jugador por socket ID
  getPlayerBySocketId(socketId) {
    return Array.from(this.players.values())
      .find(player => player.socketId === socketId);
  }

  // Obtener host actual
  getHost() {
    return Array.from(this.players.values())
      .find(player => player.isHost);
  }

  // Verificar si la sala está llena
  isFull() {
    return this.players.size >= this.settings.maxPlayers;
  }

  // Verificar si la sala está vacía
  isEmpty() {
    return this.players.size === 0;
  }

  // Actualizar última actividad
  updateActivity() {
    this.lastActivity = new Date();
  }

  // Verificar si la sala debe ser eliminada por inactividad
  shouldCleanup() {
    if (!this.settings.autoCleanup) return false;
    
    const now = new Date();
    const timeSinceActivity = now - this.lastActivity;
    
    return this.isEmpty() || timeSinceActivity > this.settings.inactivityTimeout;
  }

  // Obtener información de la sala para el cliente
  toClientObject() {
    return {
      id: this.id,
      gameState: this.gameState,
      players: Array.from(this.players.values()).map(player => player.toClientObject()),
      settings: {
        maxPlayers: this.settings.maxPlayers,
        reconnectTimeout: this.settings.reconnectTimeout
      },
      createdAt: this.createdAt,
      disconnectedSlots: this.disconnectedSlots.size
    };
  }

  // Obtener información completa de la sala (para logs)
  toFullObject() {
    return {
      id: this.id,
      hostSocketId: this.hostSocketId,
      gameState: this.gameState,
      players: Array.from(this.players.values()).map(player => player.toFullObject()),
      disconnectedSlots: Array.from(this.disconnectedSlots.entries()),
      settings: this.settings,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity
    };
  }
}

module.exports = Room;