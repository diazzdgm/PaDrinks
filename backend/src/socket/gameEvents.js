/**
 * Manejador de eventos específicos del juego
 */

function setupGameEvents(socket, io, roomManager) {
  
  // Iniciar juego
  socket.on('startGame', (data, callback) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room) {
        throw new Error('Not in a room');
      }
      
      const player = room.getPlayerBySocketId(socket.id);
      if (!player || !player.isHost) {
        throw new Error('Only host can start the game');
      }
      
      if (room.players.size < 2) {
        throw new Error('Need at least 2 players to start');
      }
      
      // Cambiar estado del juego
      room.gameState = 'playing';
      room.updateActivity();
      
      // Marcar todos los jugadores como "playing"
      room.players.forEach(p => {
        if (p.status === 'lobby' || p.status === 'ready') {
          p.status = 'playing';
        }
      });
      
      const response = {
        success: true,
        room: room.toClientObject()
      };
      
      if (callback) callback(response);
      
      // Notificar a todos los jugadores
      io.to(room.id).emit('gameStarted', {
        room: room.toClientObject(),
        startedBy: player.toClientObject()
      });
      
      console.log(`🎮 Game started in room ${room.id} by ${player.id}`);
      
    } catch (error) {
      console.error(`❌ Error starting game:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });

  // Pausar juego
  socket.on('pauseGame', (data, callback) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room) {
        throw new Error('Not in a room');
      }
      
      const player = room.getPlayerBySocketId(socket.id);
      if (!player || !player.isHost) {
        throw new Error('Only host can pause the game');
      }
      
      if (room.gameState !== 'playing') {
        throw new Error('Game is not currently playing');
      }
      
      room.gameState = 'paused';
      room.updateActivity();
      
      const response = {
        success: true,
        room: room.toClientObject(),
        reason: data?.reason || 'Game paused by host'
      };
      
      if (callback) callback(response);
      
      // Notificar a todos los jugadores
      io.to(room.id).emit('gamePaused', response);
      
      console.log(`⏸️ Game paused in room ${room.id}`);
      
    } catch (error) {
      console.error(`❌ Error pausing game:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });

  // Reanudar juego
  socket.on('resumeGame', (data, callback) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room) {
        throw new Error('Not in a room');
      }
      
      const player = room.getPlayerBySocketId(socket.id);
      if (!player || !player.isHost) {
        throw new Error('Only host can resume the game');
      }
      
      if (room.gameState !== 'paused') {
        throw new Error('Game is not currently paused');
      }
      
      room.gameState = 'playing';
      room.updateActivity();
      
      const response = {
        success: true,
        room: room.toClientObject()
      };
      
      if (callback) callback(response);
      
      // Notificar a todos los jugadores
      io.to(room.id).emit('gameResumed', response);
      
      console.log(`▶️ Game resumed in room ${room.id}`);
      
    } catch (error) {
      console.error(`❌ Error resuming game:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });

  // Enviar acción de juego
  socket.on('gameAction', (data, callback) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room) {
        throw new Error('Not in a room');
      }
      
      const player = room.getPlayerBySocketId(socket.id);
      if (!player) {
        throw new Error('Player not found');
      }
      
      if (room.gameState !== 'playing') {
        throw new Error('Game is not currently playing');
      }
      
      room.updateActivity();
      
      // Preparar datos de la acción
      const actionData = {
        action: data.action,
        data: data.data,
        player: player.toClientObject(),
        timestamp: new Date().toISOString()
      };
      
      const response = {
        success: true,
        acknowledged: true
      };
      
      if (callback) callback(response);
      
      // Broadcast de la acción a todos los jugadores (incluyendo el emisor)
      io.to(room.id).emit('gameActionReceived', actionData);
      
      console.log(`🎯 Game action ${data.action} from ${player.id} in room ${room.id}`);
      
    } catch (error) {
      console.error(`❌ Error processing game action:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });

  // Agregar jugador durante el juego (solo host)
  socket.on('addPlayerMidGame', (data, callback) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room) {
        throw new Error('Not in a room');
      }
      
      const host = room.getPlayerBySocketId(socket.id);
      if (!host || !host.isHost) {
        throw new Error('Only host can add players during game');
      }
      
      if (room.isFull()) {
        throw new Error('Room is full');
      }
      
      const response = {
        success: true,
        message: 'Ready to accept new player',
        room: room.toClientObject()
      };
      
      if (callback) callback(response);
      
      // Pausar juego temporalmente si está jugando
      if (room.gameState === 'playing') {
        room.gameState = 'paused';
        
        io.to(room.id).emit('gamePaused', {
          reason: 'Adding new player',
          temporary: true,
          room: room.toClientObject()
        });
      }
      
      console.log(`➕ Host preparing to add player to room ${room.id}`);
      
    } catch (error) {
      console.error(`❌ Error preparing to add player:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });

  // Nota: kickPlayer event está manejado en socketHandler.js para evitar duplicados

  // Sincronizar estado del juego (para reconexiones)
  socket.on('syncGameState', (callback) => {
    try {
      const room = roomManager.getRoomBySocketId(socket.id);
      
      if (!room) {
        throw new Error('Not in a room');
      }
      
      const player = room.getPlayerBySocketId(socket.id);
      if (!player) {
        throw new Error('Player not found');
      }
      
      const response = {
        success: true,
        room: room.toClientObject(),
        player: player.toClientObject(),
        timestamp: new Date().toISOString()
      };
      
      if (callback) callback(response);
      
      console.log(`🔄 Game state synced for ${player.id} in room ${room.id}`);
      
    } catch (error) {
      console.error(`❌ Error syncing game state:`, error.message);
      
      const errorResponse = {
        success: false,
        error: error.message
      };
      
      if (callback) callback(errorResponse);
      socket.emit('error', errorResponse);
    }
  });
}

module.exports = {
  setupGameEvents
};