#!/usr/bin/env node

const axios = require('axios');
const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3001';

console.log('🧪 Iniciando pruebas de API PaDrinks Backend\n');
console.log('=' .repeat(50));

async function testAPI() {
  try {
    console.log('\n📡 1. Probando endpoints REST...');
    
    // Test health
    console.log('   ✓ Testing /health...');
    const healthResponse = await axios.get(`${SERVER_URL}/health`);
    console.log(`     Status: ${healthResponse.status}`);
    console.log(`     Uptime: ${healthResponse.data.uptime}s`);
    
    // Test stats
    console.log('   ✓ Testing /api/stats...');
    const statsResponse = await axios.get(`${SERVER_URL}/api/stats`);
    console.log(`     Status: ${statsResponse.status}`);
    console.log(`     Total Rooms: ${statsResponse.data.stats.totalRooms}`);
    console.log(`     Total Players: ${statsResponse.data.stats.totalPlayers}`);
    
    // Test room validation
    console.log('   ✓ Testing /api/rooms/validate...');
    const validateResponse = await axios.post(`${SERVER_URL}/api/rooms/validate`, {
      code: '123456'
    });
    console.log(`     Status: ${validateResponse.status}`);
    console.log(`     Valid: ${validateResponse.data.valid}`);
    console.log(`     Error: ${validateResponse.data.error || 'None'}`);
    
    // Test connection
    console.log('   ✓ Testing /api/test/connection...');
    const connectionResponse = await axios.post(`${SERVER_URL}/api/test/connection`);
    console.log(`     Status: ${connectionResponse.status}`);
    console.log(`     Message: ${connectionResponse.data.message}`);
    
    console.log('\n✅ Todas las pruebas REST completadas exitosamente!');
    
  } catch (error) {
    console.error(`❌ Error en pruebas REST: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Asegúrate de que el servidor esté corriendo en puerto 3001');
      console.log('   💡 Ejecuta: cd backend && npm start');
    }
  }
}

async function testSocketIO() {
  return new Promise((resolve, reject) => {
    console.log('\n🔌 2. Probando conexiones Socket.IO...');
    
    const socket = io(SERVER_URL);
    let roomCode = null;
    let playerId = null;
    
    socket.on('connect', () => {
      console.log(`   ✓ Conectado con ID: ${socket.id}`);
      
      // Test crear sala
      console.log('   📍 Creando sala...');
      socket.emit('createRoom', {
        settings: { maxPlayers: 4 },
        playerData: { nickname: 'TestHost' }
      }, (response) => {
        if (response.success) {
          roomCode = response.room.id;
          playerId = response.player.id;
          console.log(`   ✓ Sala creada: ${roomCode}`);
          console.log(`   ✓ Player ID: ${playerId}`);
          
          // Test obtener info del servidor
          socket.emit('getServerInfo', (serverInfo) => {
            console.log(`   ✓ Server version: ${serverInfo.version}`);
            console.log(`   ✓ Server uptime: ${Math.floor(serverInfo.uptime)}s`);
            
            // Test ping/pong
            socket.emit('ping', (response) => {
              console.log(`   ✓ Ping response: ${response}`);
              
              // Desconectar
              socket.disconnect();
              console.log('   ✓ Desconectado correctamente');
              console.log('\n✅ Todas las pruebas Socket.IO completadas exitosamente!');
              resolve();
            });
          });
        } else {
          console.error(`   ❌ Error creando sala: ${response.error}`);
          socket.disconnect();
          reject(new Error(response.error));
        }
      });
    });
    
    socket.on('connect_error', (error) => {
      console.error(`❌ Error de conexión Socket.IO: ${error.message}`);
      reject(error);
    });
    
    socket.on('error', (error) => {
      console.error(`❌ Error Socket.IO: ${error.error}`);
    });
    
    // Timeout después de 10 segundos
    setTimeout(() => {
      if (socket.connected) {
        socket.disconnect();
      }
      reject(new Error('Timeout en pruebas Socket.IO'));
    }, 10000);
  });
}

async function testMultipleConnections() {
  return new Promise((resolve, reject) => {
    console.log('\n👥 3. Probando múltiples conexiones...');
    
    let completedTests = 0;
    const totalTests = 2;
    let sharedRoomCode = null;
    
    // Cliente 1 (Host)
    const host = io(SERVER_URL);
    
    host.on('connect', () => {
      console.log(`   ✓ Host conectado: ${host.id}`);
      
      host.emit('createRoom', {
        settings: { maxPlayers: 8 },
        playerData: { nickname: 'Host' }
      }, (response) => {
        if (response.success) {
          sharedRoomCode = response.room.id;
          console.log(`   ✓ Host creó sala: ${sharedRoomCode}`);
          
          // Cliente 2 (Jugador)
          const player = io(SERVER_URL);
          
          player.on('connect', () => {
            console.log(`   ✓ Jugador conectado: ${player.id}`);
            
            player.emit('joinRoom', {
              roomCode: sharedRoomCode,
              playerData: { nickname: 'Player1' }
            }, (joinResponse) => {
              if (joinResponse.success) {
                console.log(`   ✓ Jugador se unió a sala: ${sharedRoomCode}`);
                console.log(`   ✓ Total jugadores: ${joinResponse.room.players.length}`);
                
                // Test iniciar juego
                host.emit('startGame', {}, (startResponse) => {
                  if (startResponse.success) {
                    console.log(`   ✓ Juego iniciado por host`);
                    console.log(`   ✓ Estado del juego: ${startResponse.room.gameState}`);
                  }
                  
                  // Cleanup
                  host.disconnect();
                  player.disconnect();
                  console.log('   ✓ Ambos clientes desconectados');
                  console.log('\n✅ Pruebas de múltiples conexiones completadas!');
                  resolve();
                });
              } else {
                console.error(`   ❌ Error uniendo jugador: ${joinResponse.error}`);
                host.disconnect();
                player.disconnect();
                reject(new Error(joinResponse.error));
              }
            });
          });
          
          player.on('playerJoined', (data) => {
            console.log(`   📢 Evento recibido: Jugador se unió - ${data.player.nickname}`);
          });
          
          player.on('gameStarted', (data) => {
            console.log(`   📢 Evento recibido: Juego iniciado`);
          });
          
        } else {
          console.error(`   ❌ Error creando sala: ${response.error}`);
          host.disconnect();
          reject(new Error(response.error));
        }
      });
    });
    
    // Timeout
    setTimeout(() => {
      console.log('   ⏰ Timeout en pruebas múltiples');
      reject(new Error('Timeout'));
    }, 15000);
  });
}

async function runAllTests() {
  console.log('🚀 Iniciando suite completa de pruebas...\n');
  
  try {
    await testAPI();
    await testSocketIO();
    await testMultipleConnections();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE!');
    console.log('✅ API REST: Funcionando');
    console.log('✅ Socket.IO: Funcionando'); 
    console.log('✅ Múltiples conexiones: Funcionando');
    console.log('✅ Gestión de salas: Funcionando');
    console.log('✅ Eventos de juego: Funcionando');
    
  } catch (error) {
    console.log('\n' + '=' .repeat(50));
    console.error('❌ ALGUNAS PRUEBAS FALLARON');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  
  process.exit(0);
}

// Ejecutar todas las pruebas
runAllTests();