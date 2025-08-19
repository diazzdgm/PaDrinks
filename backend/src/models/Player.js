const { v4: uuidv4 } = require('uuid');

class Player {
  constructor(socketId, nickname = null, playerData = {}) {
    this.id = uuidv4();
    this.socketId = socketId;
    this.nickname = nickname;
    
    // Información básica del perfil
    this.avatar = playerData.avatar || playerData.photoUri || null;
    this.photoUri = playerData.photoUri || null;
    this.emoji = playerData.emoji || '😄';
    this.photo = playerData.photo || null;
    
    // Información personal (opcional)
    this.gender = playerData.gender || null; // 'man', 'woman', 'other'
    this.orientation = playerData.orientation || null; // 'men', 'women', 'both'
    
    // Estado del jugador
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

  // Actualizar información del jugador
  updatePlayerData(playerData) {
    if (playerData.nickname) this.nickname = playerData.nickname;
    if (playerData.avatar !== undefined) this.avatar = playerData.avatar;
    if (playerData.photoUri !== undefined) this.photoUri = playerData.photoUri;
    if (playerData.emoji !== undefined) this.emoji = playerData.emoji;
    if (playerData.gender !== undefined) this.gender = playerData.gender;
    if (playerData.orientation !== undefined) this.orientation = playerData.orientation;
    this.updateLastSeen();
  }

  // Convertir a objeto para envío al cliente
  toClientObject() {
    return {
      id: this.id,
      socketId: this.socketId, // Incluir socketId para identificación
      nickname: this.nickname,
      avatar: this.avatar,
      photoUri: this.photoUri,
      emoji: this.emoji,
      photo: this.photo,
      gender: this.gender,
      orientation: this.orientation,
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
      photoUri: this.photoUri,
      emoji: this.emoji,
      gender: this.gender,
      orientation: this.orientation,
      status: this.status,
      isHost: this.isHost,
      joinedAt: this.joinedAt,
      lastSeen: this.lastSeen,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

module.exports = Player;