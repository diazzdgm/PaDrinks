// Funciones auxiliares para la aplicación
import { GAME_CONSTANTS } from './constants';

/**
 * Generar código de sala aleatorio
 */
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < GAME_CONSTANTS.ROOM_CODE_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generar ID único para jugadores
 */
export const generatePlayerId = () => {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Formatear tiempo en mm:ss
 */
export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Mezclar array aleatoriamente (Fisher-Yates)
 */
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Seleccionar elemento aleatorio de array
 */
export const getRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Seleccionar múltiples elementos aleatorios sin repetir
 */
export const getRandomElements = (array, count) => {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
};

/**
 * Validar nombre de jugador
 */
export const validatePlayerName = (name) => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'El nombre no puede estar vacío' };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, error: 'El nombre debe tener al menos 2 caracteres' };
  }
  
  if (name.trim().length > 15) {
    return { valid: false, error: 'El nombre no puede tener más de 15 caracteres' };
  }
  
  // Caracteres permitidos: letras, números, espacios, algunos símbolos
  const validChars = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s._-]+$/;
  if (!validChars.test(name.trim())) {
    return { valid: false, error: 'El nombre contiene caracteres no permitidos' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validar código de sala
 */
export const validateRoomCode = (code) => {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'El código no puede estar vacío' };
  }
  
  if (code.trim().length !== GAME_CONSTANTS.ROOM_CODE_LENGTH) {
    return { valid: false, error: `El código debe tener ${GAME_CONSTANTS.ROOM_CODE_LENGTH} caracteres` };
  }
  
  const validChars = /^[A-Z0-9]+$/;
  if (!validChars.test(code.trim().toUpperCase())) {
    return { valid: false, error: 'El código solo puede contener letras y números' };
  }
  
  return { valid: true, error: null };
};

/**
 * Calcular estadísticas del juego
 */
export const calculateGameStats = (players, roundHistory) => {
  const stats = {
    totalShots: 0,
    totalRounds: roundHistory.length,
    kingOfShots: null,
    mostChill: null,
    mvp: null,
    dramaQueen: null,
  };
  
  // Calcular totales
  Object.values(players.playerScores || {}).forEach(shots => {
    stats.totalShots += shots;
  });
  
  // Encontrar rey del shot (más shots)
  let maxShots = -1;
  let minShots = Infinity;
  
  Object.entries(players.playerScores || {}).forEach(([playerId, shots]) => {
    if (shots > maxShots) {
      maxShots = shots;
      stats.kingOfShots = playerId;
    }
    if (shots < minShots) {
      minShots = shots;
      stats.mostChill = playerId;
    }
  });
  
  // MVP (más votaciones ganadas)
  let maxVotes = -1;
  Object.entries(players.playerStats || {}).forEach(([playerId, playerStats]) => {
    if (playerStats.votes > maxVotes) {
      maxVotes = playerStats.votes;
      stats.mvp = playerId;
    }
  });
  
  // Drama Queen (más poderes usados o participación activa)
  let maxPowers = -1;
  Object.entries(players.playerStats || {}).forEach(([playerId, playerStats]) => {
    if (playerStats.powers > maxPowers) {
      maxPowers = playerStats.powers;
      stats.dramaQueen = playerId;
    }
  });
  
  return stats;
};

/**
 * Generar color aleatorio para avatares
 */
export const getRandomAvatarColor = () => {
  const colors = [
    '#FF7F11', '#A8E10C', '#0EBDE1', '#F8BBD9', 
    '#FFE082', '#C8E6C9', '#BBDEFB', '#FFCCBC',
    '#E1BEE7', '#B39DDB', '#90CAF9', '#81C784'
  ];
  return getRandomElement(colors);
};

/**
 * Obtener emoji aleatorio para avatares
 */
export const getRandomAvatarEmoji = () => {
  const emojis = [
    '😀', '😃', '😄', '😁', '😊', '😎', '🤓', '🥳',
    '😇', '🤠', '🤗', '🤔', '😏', '😌', '😍', '🥰',
    '😘', '😗', '🙃', '😛', '🤪', '😝', '🤭', '🤫'
  ];
  return getRandomElement(emojis);
};

/**
 * Debounce function para optimizar búsquedas
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Throttle function para optimizar eventos frecuentes
 */
export const throttle = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = new Date().getTime();
    if (now - lastCall < delay) return;
    lastCall = now;
    return func(...args);
  };
};