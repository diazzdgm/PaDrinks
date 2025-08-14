# PaDrinks Backend Server

Backend server para el juego social multijugador PaDrinks, construido con Node.js, Express y Socket.IO.

## 🚀 Características

- **Gestión de Salas**: Crear y unirse a salas con códigos de 6 dígitos
- **Comunicación en Tiempo Real**: Socket.IO para eventos en vivo
- **Reconexión Inteligente**: Sistema robusto de reconexión automática
- **Gestión Dinámica de Jugadores**: Agregar/eliminar jugadores durante el juego
- **API REST**: Endpoints para validación y gestión de salas
- **Sistema de Heartbeat**: Detección automática de desconexiones
- **Rate Limiting**: Protección contra abuso de conexiones

## 📋 Requisitos

- Node.js 18+ 
- npm 8+

## 🛠️ Instalación

```bash
# Navegar al directorio backend
cd backend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Iniciar servidor de producción
npm start
```

## 🔧 Configuración

El servidor utiliza las siguientes variables de entorno:

```bash
PORT=3001              # Puerto del servidor (default: 3001)
NODE_ENV=development   # Entorno (development/production)
```

## 📡 API Endpoints

### Información del Servidor
- `GET /health` - Estado del servidor
- `GET /api/stats` - Estadísticas del servidor
- `GET /api/rooms` - Lista todas las salas (debugging)

### Gestión de Salas
- `GET /api/rooms/:code` - Información de sala específica
- `POST /api/rooms/validate` - Validar código de sala
- `DELETE /api/rooms/:code` - Eliminar sala (admin)

### Códigos QR
- `POST /api/qr/generate` - Generar datos para código QR

### Testing
- `POST /api/test/connection` - Probar conectividad

## 🔌 Eventos Socket.IO

### Eventos de Sala
```javascript
// Crear sala
socket.emit('createRoom', { 
  settings: { maxPlayers: 8 }, 
  playerData: { nickname: 'Player1' } 
});

// Unirse a sala
socket.emit('joinRoom', { 
  roomCode: '123456', 
  playerData: { nickname: 'Player2' } 
});

// Salir de sala
socket.emit('leaveRoom');

// Reconectar
socket.emit('reconnectToRoom', { 
  roomCode: '123456', 
  playerId: 'uuid' 
});
```

### Eventos de Juego
```javascript
// Iniciar juego (solo host)
socket.emit('startGame');

// Pausar juego (solo host)
socket.emit('pauseGame', { reason: 'Adding player' });

// Reanudar juego (solo host)
socket.emit('resumeGame');

// Enviar acción de juego
socket.emit('gameAction', { 
  action: 'drawCard', 
  data: { cardId: 'card123' } 
});

// Expulsar jugador (solo host)
socket.emit('kickPlayer', { 
  playerId: 'uuid', 
  reason: 'Inactive' 
});
```

### Eventos del Sistema
```javascript
// Heartbeat
socket.emit('ping');

// Obtener info del servidor
socket.emit('getServerInfo');

// Sincronizar estado
socket.emit('syncGameState');
```

## 📊 Eventos Recibidos

```javascript
// Eventos de sala
socket.on('roomCreated', (data) => {});
socket.on('playerJoined', (data) => {});
socket.on('playerLeft', (data) => {});
socket.on('playerDisconnected', (data) => {});
socket.on('playerReconnected', (data) => {});

// Eventos de juego
socket.on('gameStarted', (data) => {});
socket.on('gamePaused', (data) => {});
socket.on('gameResumed', (data) => {});
socket.on('gameActionReceived', (data) => {});
socket.on('playerKicked', (data) => {});

// Eventos de sistema
socket.on('error', (error) => {});
socket.on('kicked', (data) => {});
```

## 🏗️ Arquitectura

```
backend/
├── src/
│   ├── server.js              # Servidor principal
│   ├── socket/
│   │   ├── socketHandler.js   # Manejador principal de sockets
│   │   └── gameEvents.js      # Eventos específicos del juego
│   ├── models/
│   │   ├── Room.js           # Modelo de sala
│   │   └── Player.js         # Modelo de jugador
│   ├── utils/
│   │   ├── roomManager.js    # Gestor de salas
│   │   └── codeGenerator.js  # Generador de códigos
│   └── routes/
│       └── api.js            # Rutas API REST
├── package.json
└── README.md
```

## 🔄 Flujo de Conexión

1. **Crear Sala**: Host crea sala y recibe código de 6 dígitos
2. **Unirse**: Otros jugadores se unen usando el código
3. **Jugar**: Host inicia el juego, todos reciben eventos en tiempo real
4. **Reconexión**: Jugadores pueden reconectarse automáticamente
5. **Gestión**: Host puede agregar/eliminar jugadores dinámicamente

## 🛡️ Seguridad

- Rate limiting en conexiones
- Validación de códigos de sala
- Helmet.js para headers de seguridad
- CORS configurado para desarrollo

## 🚦 Testing

```bash
# Probar conectividad
curl http://localhost:3001/health

# Validar código de sala
curl -X POST http://localhost:3001/api/rooms/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}'

# Ver estadísticas
curl http://localhost:3001/api/stats
```

## 📝 Logs

El servidor genera logs detallados:
- ✅ Conexiones exitosas
- ❌ Errores y excepciones
- 🎮 Eventos de juego
- 🔄 Reconexiones
- 🧹 Limpieza automática

## 🔧 Desarrollo

Para desarrollo activo:

```bash
# Modo desarrollo con recarga automática
npm run dev

# Ver logs en tiempo real
tail -f server.log
```

## 📱 Integración con Cliente

El cliente React Native debe conectarse usando:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
```

## 🐛 Troubleshooting

### Puerto ocupado
```bash
# Encontrar proceso usando el puerto
lsof -i :3001
kill -9 PID
```

### Problemas de CORS
- Verificar configuración en `server.js`
- En producción, especificar dominios permitidos

### Desconexiones frecuentes
- Verificar configuración de heartbeat
- Ajustar timeouts en modelos de Room

## 📈 Próximas Funcionalidades

- [ ] Auto-descubrimiento UDP en red local
- [ ] Códigos QR avanzados con información de red
- [ ] Persistencia con Redis
- [ ] Métricas avanzadas con Prometheus
- [ ] Tests automatizados

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request