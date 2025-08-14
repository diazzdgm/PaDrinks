const express = require('express');
const router = express.Router();
const roomManager = require('../utils/roomManager');
const codeGenerator = require('../utils/codeGenerator');

/**
 * Rutas API REST para PaDrinks Backend
 */

// Middleware para logging de requests
router.use((req, res, next) => {
  console.log(`📡 API ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// GET /api/health - Estado del servidor
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// GET /api/stats - Estadísticas del servidor
router.get('/stats', (req, res) => {
  const stats = roomManager.getStats();
  res.json({
    success: true,
    stats: stats,
    timestamp: new Date().toISOString()
  });
});

// GET /api/rooms - Lista de salas (para debugging)
router.get('/rooms', (req, res) => {
  try {
    const rooms = roomManager.getAllRooms();
    res.json({
      success: true,
      rooms: rooms,
      count: rooms.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/rooms/:code - Información de una sala específica
router.get('/rooms/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    if (!codeGenerator.isValidCodeFormat(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room code format'
      });
    }
    
    const room = roomManager.getRoom(code);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    res.json({
      success: true,
      room: room.toClientObject()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/rooms/validate - Validar código de sala
router.post('/rooms/validate', (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Room code is required'
      });
    }
    
    // Validar formato
    if (!codeGenerator.isValidCodeFormat(code)) {
      return res.json({
        success: false,
        valid: false,
        error: 'Invalid code format'
      });
    }
    
    // Verificar si la sala existe
    const room = roomManager.getRoom(code);
    
    if (!room) {
      return res.json({
        success: true,
        valid: false,
        error: 'Room not found'
      });
    }
    
    // Verificar si la sala está llena
    if (room.isFull()) {
      return res.json({
        success: true,
        valid: false,
        error: 'Room is full'
      });
    }
    
    res.json({
      success: true,
      valid: true,
      room: {
        id: room.id,
        gameState: room.gameState,
        playerCount: room.players.size,
        maxPlayers: room.settings.maxPlayers,
        canJoin: !room.isFull()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/qr/generate - Generar información para código QR
router.post('/qr/generate', (req, res) => {
  try {
    const { roomCode, hostIp } = req.body;
    
    if (!roomCode) {
      return res.status(400).json({
        success: false,
        error: 'Room code is required'
      });
    }
    
    // Validar que la sala existe
    const room = roomManager.getRoom(roomCode);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    // Generar datos para QR
    const qrData = {
      type: 'padrinks_room',
      version: '1.0',
      roomCode: roomCode,
      hostIp: hostIp || 'localhost',
      port: process.env.PORT || 3001,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      qrData: qrData,
      qrString: JSON.stringify(qrData)
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/rooms/:code - Eliminar sala (solo para debugging/admin)
router.delete('/rooms/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    if (!codeGenerator.isValidCodeFormat(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room code format'
      });
    }
    
    const room = roomManager.getRoom(code);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    roomManager.deleteRoom(code, 'admin_delete');
    
    res.json({
      success: true,
      message: `Room ${code} deleted successfully`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/codes/stats - Estadísticas de códigos
router.get('/codes/stats', (req, res) => {
  try {
    const stats = codeGenerator.getStats();
    res.json({
      success: true,
      codeStats: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/test/connection - Endpoint para probar conectividad
router.post('/test/connection', (req, res) => {
  const clientInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Connection test successful',
    server: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    client: clientInfo
  });
});

// Middleware de manejo de errores 404
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl
  });
});

module.exports = router;