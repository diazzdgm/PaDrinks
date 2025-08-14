const { v4: uuidv4 } = require('uuid');

class Player {
  constructor(socketId, nickname = null, avatar = null) {
    this.id = uuidv4();
    this.socketId = socketId;
    this.nickname = nickname;
    this.avatar = avatar;
    this.status = 'lobby'; // lobby, ready, playing, disconnected, reconnecting
    this.isHost = false;
    this.joinedAt = new Date();
    this.lastSeen = new Date();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  // Actualizar última vez visto (heartbeat)
  updateLastSeen() {
    this.lastSeen = new Date();
  }

  // Marcar como desconectado
  setDisconnected() {
    this.status = 'disconnected';
    this.socketId = null;
  }

  // Marcar como reconectando
  setReconnecting() {
    this.status = 'reconnecting';
    this.reconnectAttempts++;
  }

  // Reconectar con nuevo socket
  reconnect(newSocketId) {
    this.socketId = newSocketId;
    this.status = 'lobby';
    this.reconnectAttempts = 0;
    this.updateLastSeen();
  }

  // Verificar si puede reconectarse
  canReconnect() {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  // Convertir a objeto para envío al cliente
  toClientObject() {
    return {
      id: this.id,
      nickname: this.nickname,
      avatar: this.avatar,
      status: this.status,
      isHost: this.isHost,
      joinedAt: this.joinedAt
    };
  }

  // Convertir a objeto completo (para logs del servidor)
  toFullObject() {
    return {
      id: this.id,
      socketId: this.socketId,
      nickname: this.nickname,
      avatar: this.avatar,
      status: this.status,
      isHost: this.isHost,
      joinedAt: this.joinedAt,
      lastSeen: this.lastSeen,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

module.exports = Player;