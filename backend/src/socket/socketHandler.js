const roomManager = require('../utils/roomManager');
const gameEvents = require('./gameEvents');

/**
 * Manejador principal de conexiones Socket.IO
 */
function socketHandler(io) {
  console.log('🔌 Socket.IO handler initialized');

  io.on('connection', (socket) => {
    console.log(`🔗 New connection: ${socket.id}`);

    // Eventos de gestión de salas
    setupRoomEvents(socket, io);
    
    // Eventos de juego
    setupGameEvents(socket, io);
    
    // Eventos de sistema
    setupSystemEvents(socket, io);
    
    // Heartbeat
    setupHeartbeat(socket);
  });
}

/**
 * Configurar eventos relacionados con salas
 */
function setupRoomEvents(socket, io) {
  
  // Crear nueva sala
  socket.on('createRoom', (data, callback) => {
    try {
      const { settings, playerData } = data || {};
      
      // Crear sala
      const room = roomManager.createRoom(socket.id, settings);
      
      // Crear y agregar jugador host
      const Player = require('../models/Player');
      const hostPlayer = new Player(socket.id, playerData?.nickname, playerData);
      room.addPlayer(hostPlayer);
      
      // Unir socket a la sala
      socket.join(room.id);
      
      // Responder con información de la sala
      const response = {
        success: true,
        room: room.toClientObject(),
        player: hostPlayer.toClientObject(),
        isHost: true
      };
      
      if (callback) callback(response);
      
      // Notificar a otros servicios si es necesario
      socket.emit('roomCreated', response);
      
      console.log(`✅ Room ${room.id} created by ${socket.id}`);
      
    } catch (error) {
      console.error(`❌ Error creating room:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });

  // Validar si una sala existe (sin unirse)
  socket.on('validateRoom', (data, callback) => {
    console.log(`🔍 validateRoom event received from ${socket.id}:`, data);
    
    try {
      const { roomCode } = data;
      
      if (!roomCode) {
        throw new Error('Room code is required');
      }
      
      console.log(`🔍 Looking for room: ${roomCode}`);
      
      // Verificar si la sala existe
      const room = roomManager.getRoom(roomCode);
      
      if (!room) {
        console.log(`❌ Room ${roomCode} not found`);
        throw new Error('Room not found');
      }
      
      console.log(`✅ Room found: ${roomCode}, players: ${room.players.size}/${room.settings.maxPlayers}`);
      
      if (room.isFull()) {
        console.log(`❌ Room ${roomCode} is full`);
        throw new Error('Room is full');
      }
      
      // Responder con información básica de la sala (sin unirse)
      const response = {
        success: true,
        room: {
          id: room.id,
          playersCount: room.players.size,
          maxPlayers: room.settings.maxPlayers,
          settings: room.settings
        }
      };
      
      console.log(`✅ Sending validation response:`, response);
      
      if (callback) {
        callback(response);
      } else {
        console.log('❌ No callback provided for validateRoom');
      }
      
      console.log(`✅ Room ${roomCode} validated successfully`);
      
    } catch (error) {
      console.error(`❌ Error validating room:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      console.log(`❌ Sending error response:`, errorResponse);
      
      if (callback) {
        callback(errorResponse);
      } else {
        console.log('❌ No callback provided for error response');
      }
    }
  });

  // Unirse a sala existente
  socket.on('joinRoom', (data, callback) => {
    try {
      const { roomCode, playerData } = data;
      
      if (!roomCode) {
        throw new Error('Room code is required');
      }
      
      // Intentar unirse a la sala
      const result = roomManager.joinRoom(roomCode, socket.id, playerData);
      
      // Unir socket a la sala
      socket.join(roomCode);
      
      // Responder al jugador que se unió
      const response = {
        success: true,
        room: result.room.toClientObject(),
        player: result.player.toClientObject(),
        isHost: result.player.isHost
      };
      
      if (callback) callback(response);
      
      // Notificar a otros jugadores en la sala
      socket.to(roomCode).emit('playerJoined', {
        player: result.player.toClientObject(),
        room: result.room.toClientObject()
      });
      
      console.log(`✅ Player ${result.player.id} joined room ${roomCode}`);
      
    } catch (error) {
      console.error(`❌ Error joining room:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });

  // Salir de sala
  socket.on('leaveRoom', (data, callback) => {
    try {
      // Primero obtener información de la sala ANTES de remover al jugador
      const room = roomManager.getRoomBySocketId(socket.id);
      const leavingPlayer = room ? room.getPlayerBySocketId(socket.id) : null;
      const isHost = leavingPlayer ? leavingPlayer.isHost : false;
      const roomId = room ? room.id : null;
      const otherPlayers = room ? Array.from(room.players.values()).filter(p => p.socketId !== socket.id) : [];
      
      console.log(`🚪 Player ${leavingPlayer?.nickname || socket.id} leaving room ${roomId}`);
      console.log(`👑 Is host: ${isHost}`);
      console.log(`👥 Other players in room: ${otherPlayers.length}`);
      otherPlayers.forEach(p => console.log(`  - ${p.nickname} (${p.socketId})`));
      
      // Ahora sí remover al jugador
      const result = roomManager.leaveRoom(socket.id, true);
      
      if (result.success) {
        // Salir del room de socket.io
        socket.leave(roomId);
        
        // Responder al jugador
        const response = {
          success: true,
          message: 'Left room successfully'
        };
        
        if (callback) callback(response);
        
        // Si era el host y había otros jugadores, disolver la sala
        if (isHost && otherPlayers.length > 0) {
          console.log(`👑 Host left room ${roomId}, dissolving room and kicking ${otherPlayers.length} players`);
          
          // Notificar a todos los jugadores restantes que fueron expulsados
          console.log(`📢 Sending kicked event to room ${roomId}`);
          socket.to(roomId).emit('kicked', {
            reason: 'Host disolvió la sala',
            message: 'El host ha disuelto la sala',
            byHost: true
          });
          
          console.log(`✅ Kicked event sent to ${otherPlayers.length} players`);
          
          // La sala se eliminará automáticamente por roomManager.leaveRoom() 
          // cuando quede vacía, no necesitamos eliminarla manualmente
          
        } else {
          // Jugador normal salió, notificar a otros
          console.log(`👤 Regular player left, notifying others`);
          socket.to(roomId).emit('playerLeft', {
            player: result.player.toClientObject(),
            room: result.room.toClientObject(),
            wasHost: result.wasHost
          });
        }
        
        console.log(`✅ Player left room ${roomId} voluntarily`);
      } else {
        throw new Error(result.reason);
      }
      
    } catch (error) {
      console.error(`❌ Error leaving room:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });

  // Reconectar a sala
  socket.on('reconnectToRoom', (data, callback) => {
    try {
      const { roomCode, playerId } = data;
      
      if (!roomCode || !playerId) {
        throw new Error('Room code and player ID are required');
      }
      
      // Intentar reconexión
      const result = roomManager.reconnectToRoom(roomCode, playerId, socket.id);
      
      // Unir socket a la sala
      socket.join(roomCode);
      
      // Responder al jugador reconectado
      const response = {
        success: true,
        room: result.room.toClientObject(),
        player: result.player.toClientObject(),
        isReconnection: true
      };
      
      if (callback) callback(response);
      
      // Notificar a otros jugadores
      socket.to(roomCode).emit('playerReconnected', {
        player: result.player.toClientObject(),
        room: result.room.toClientObject()
      });
      
      console.log(`✅ Player ${playerId} reconnected to room ${roomCode}`);
      
    } catch (error) {
      console.error(`❌ Error reconnecting:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });

  // Sincronizar información de la sala
  socket.on('syncRoom', (callback) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room) {
        throw new Error('Player is not in any room');
      }
      
      const roomData = {
        success: true,
        room: room.toClientObject()
      };
      
      if (callback) callback(roomData);
      
      // También emitir a todos los jugadores en la sala para sincronización
      io.to(room.id).emit('roomSync', roomData);
      
      console.log(`🔄 Room ${room.id} synchronized for ${socket.id}`);
      
    } catch (error) {
      console.error(`❌ Error syncing room:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
    }
  });
}

/**
 * Configurar eventos de juego
 */
function setupGameEvents(socket, io) {
  // Delegar eventos de juego al módulo especializado
  gameEvents.setupGameEvents(socket, io, roomManager);
}

/**
 * Configurar eventos de sistema
 */
function setupSystemEvents(socket, io) {
  
  // Desconexión
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Disconnection: ${socket.id} (${reason})`);
    
    // Manejar salida de sala (no voluntaria)
    const result = roomManager.leaveRoom(socket.id, false);
    
    if (result.success) {
      // Notificar a otros jugadores sobre la desconexión
      socket.to(result.room.id).emit('playerDisconnected', {
        player: result.player.toClientObject(),
        room: result.room.toClientObject(),
        reason: reason
      });
      
      console.log(`🔌 Player disconnected from room ${result.room.id}`);
    }
  });

  // Ping/Pong para heartbeat
  socket.on('ping', (callback) => {
    if (callback) callback('pong');
  });

  // Obtener información del servidor
  socket.on('getServerInfo', (callback) => {
    const stats = roomManager.getStats();
    
    const serverInfo = {
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      stats: stats
    };
    
    if (callback) callback(serverInfo);
  });
}

/**
 * Configurar sistema de heartbeat
 */
function setupHeartbeat(socket) {
  const heartbeatInterval = 30000; // 30 segundos
  
  const heartbeat = setInterval(() => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (room) {
      const player = room.getPlayerBySocketId(socket.id);
      if (player) {
        player.updateLastSeen();
      }
    }
  }, heartbeatInterval);
  
  // Limpiar intervalo al desconectar
  socket.on('disconnect', () => {
    clearInterval(heartbeat);
  });
}

module.exports = socketHandler;