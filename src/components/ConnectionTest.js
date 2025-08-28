import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSocket, useRoom } from '../hooks/useSocket';
import { theme } from '../styles/theme';
import { 
  scale, 
  scaleWidth, 
  scaleHeight, 
  scaleText, 
  scaleModerate,
  getDeviceType,
  isSmallDevice,
  isTablet,
  RESPONSIVE 
} from '../utils/responsive';

/**
 * Componente de prueba para la conexión con el backend
 * Utilizado para testing y debugging
 */
const ConnectionTest = () => {
  const { connected, connecting, connect, disconnect, socketId } = useSocket();
  const { 
    createRoom, 
    joinRoom, 
    leaveRoom, 
    room, 
    player, 
    isHost, 
    loading, 
    error 
  } = useRoom();
  
  const [testRoomCode, setTestRoomCode] = useState('');

  // Auto-conectar al montar
  useEffect(() => {
    if (!connected && !connecting) {
      handleConnect();
    }
  }, []);

  const handleConnect = async () => {
    try {
      await connect();
      Alert.alert('✅ Conectado', `Socket ID: ${socketId}`);
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo conectar: ${error.message}`);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const result = await createRoom({
        maxPlayers: 4,
        nickname: 'TestHost',
        gameType: 'classic'
      });
      
      setTestRoomCode(result.roomCode);
      Alert.alert('🏠 Sala Creada', `Código: ${result.roomCode}`);
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo crear sala: ${error.message}`);
    }
  };

  const handleJoinRoom = async () => {
    if (!testRoomCode) {
      Alert.alert('⚠️ Error', 'No hay código de sala disponible');
      return;
    }

    try {
      await joinRoom(testRoomCode, {
        nickname: 'TestPlayer'
      });
      
      Alert.alert('👥 Unido', `Te uniste a la sala ${testRoomCode}`);
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo unir: ${error.message}`);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      Alert.alert('👋 Saliste', 'Has salido de la sala');
      setTestRoomCode('');
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo salir: ${error.message}`);
    }
  };

  const getConnectionStatus = () => {
    if (connecting) return { text: 'Conectando...', color: '#FF9800' };
    if (connected) return { text: 'Conectado', color: '#4CAF50' };
    return { text: 'Desconectado', color: '#F44336' };
  };

  const status = getConnectionStatus();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Test de Conexión Backend</Text>
      
      {/* Estado de conexión */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={styles.statusText}>{status.text}</Text>
        {socketId && <Text style={styles.socketId}>ID: {socketId.substring(0, 8)}...</Text>}
      </View>

      {/* Botones de conexión */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.connectButton]} 
          onPress={connected ? disconnect : handleConnect}
          disabled={connecting}
        >
          <Text style={styles.buttonText}>
            {connected ? 'Desconectar' : 'Conectar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Información de sala */}
      {room && (
        <View style={styles.roomInfo}>
          <Text style={styles.roomTitle}>🏠 Sala Actual</Text>
          <Text style={styles.roomText}>Código: {room.id}</Text>
          <Text style={styles.roomText}>Jugadores: {room.players?.length || 0}</Text>
          <Text style={styles.roomText}>Host: {isHost ? 'Sí' : 'No'}</Text>
          <Text style={styles.roomText}>Estado: {room.gameState}</Text>
        </View>
      )}

      {/* Botones de sala */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.createButton]} 
          onPress={handleCreateRoom}
          disabled={!connected || loading || !!room}
        >
          <Text style={styles.buttonText}>Crear Sala</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.joinButton]} 
          onPress={handleJoinRoom}
          disabled={!connected || loading || !!room || !testRoomCode}
        >
          <Text style={styles.buttonText}>Unirse</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.leaveButton]} 
          onPress={handleLeaveRoom}
          disabled={!connected || loading || !room}
        >
          <Text style={styles.buttonText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Información del jugador */}
      {player && (
        <View style={styles.playerInfo}>
          <Text style={styles.playerTitle}>👤 Jugador</Text>
          <Text style={styles.playerText}>Nickname: {player.nickname}</Text>
          <Text style={styles.playerText}>ID: {player.id?.substring(0, 8)}...</Text>
          <Text style={styles.playerText}>Estado: {player.status}</Text>
        </View>
      )}

      {/* Errores */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}

      {/* Estado de carga */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>⏳ Cargando...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: scale(20),
    backgroundColor: '#F5F5F5',
  },
  
  title: {
    fontSize: scaleText(20),
    fontFamily: theme.fonts.primaryBold,
    textAlign: 'center',
    marginBottom: scale(20),
    color: '#333',
  },
  
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
    padding: scale(10),
    backgroundColor: 'white',
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#DDD',
  },
  
  statusDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    marginRight: scale(8),
  },
  
  statusText: {
    fontSize: scaleText(16),
    fontFamily: theme.fonts.primary,
    color: '#333',
    marginRight: scale(10),
  },
  
  socketId: {
    fontSize: scaleText(12),
    fontFamily: theme.fonts.primary,
    color: '#666',
  },
  
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: scale(20),
  },
  
  button: {
    paddingHorizontal: scale(15),
    paddingVertical: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    marginHorizontal: scale(5),
  },
  
  connectButton: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  
  createButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#388E3C',
  },
  
  joinButton: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
  },
  
  leaveButton: {
    backgroundColor: '#F44336',
    borderColor: '#D32F2F',
  },
  
  buttonText: {
    color: 'white',
    fontFamily: theme.fonts.primary,
    fontSize: scaleText(12),
    textAlign: 'center',
  },
  
  roomInfo: {
    backgroundColor: 'white',
    padding: scale(15),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: scale(20),
  },
  
  roomTitle: {
    fontSize: scaleText(16),
    fontFamily: theme.fonts.primaryBold,
    color: '#333',
    marginBottom: scale(10),
  },
  
  roomText: {
    fontSize: scaleText(14),
    fontFamily: theme.fonts.primary,
    color: '#666',
    marginBottom: scale(5),
  },
  
  playerInfo: {
    backgroundColor: 'white',
    padding: scale(15),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: scale(20),
  },
  
  playerTitle: {
    fontSize: scaleText(16),
    fontFamily: theme.fonts.primaryBold,
    color: '#333',
    marginBottom: scale(10),
  },
  
  playerText: {
    fontSize: scaleText(14),
    fontFamily: theme.fonts.primary,
    color: '#666',
    marginBottom: scale(5),
  },
  
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#F44336',
    marginBottom: scale(10),
  },
  
  errorText: {
    color: '#D32F2F',
    fontFamily: theme.fonts.primary,
    fontSize: scaleText(14),
    textAlign: 'center',
  },
  
  loadingContainer: {
    backgroundColor: '#E3F2FD',
    padding: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  
  loadingText: {
    color: '#1976D2',
    fontFamily: theme.fonts.primary,
    fontSize: scaleText(14),
    textAlign: 'center',
  },
});

export default ConnectionTest;