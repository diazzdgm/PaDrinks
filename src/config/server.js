import { Platform } from 'react-native';

/**
 * Configuración del servidor para diferentes entornos
 */

// INSTRUCCIONES PARA CONFIGURAR IP REAL:
// 1. Desde Windows CMD, ejecuta: ipconfig
// 2. Busca "Wireless LAN adapter Wi-Fi" o "Ethernet adapter"
// 3. Copia la dirección IPv4 (ej: 192.168.1.100)
// 4. Reemplaza YOUR_COMPUTER_IP abajo

const SERVER_CONFIGS = {
  // Para emulador Android (usa localhost del host)
  android_emulator: 'http://10.0.2.2:3001',
  
  // Para iOS Simulator (usa localhost)
  ios_simulator: 'http://localhost:3001',
  
  // Para dispositivos reales (CAMBIAR YOUR_COMPUTER_IP por tu IP real)
  real_device: 'http://YOUR_COMPUTER_IP:3001',
  
  // IPs comunes para referencia:
  // http://192.168.1.100:3001  (red doméstica típica)
  // http://192.168.0.100:3001  (red doméstica típica)
  // http://10.0.1.100:3001     (algunas redes)
};

/**
 * Detectar la configuración correcta del servidor
 */
export const getServerUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Detectar si es emulador o dispositivo real
      // Por ahora, asumimos emulador. Para dispositivo real, usar real_device
      return SERVER_CONFIGS.android_emulator;
    } else if (Platform.OS === 'ios') {
      // Para iOS Simulator
      return SERVER_CONFIGS.ios_simulator;
    }
  }
  
  // Para dispositivos reales, usar esta línea:
  // return SERVER_CONFIGS.real_device;
  
  return SERVER_CONFIGS.android_emulator;
};

/**
 * Configuración manual para testing
 * Descomenta y modifica según tu red
 */
export const MANUAL_SERVER_URL = 'http://192.168.100.18:3001'; // Tu IP actual (Windows)
// export const MANUAL_SERVER_URL = null;

/**
 * Configuración para modo túnel
 * Cuando uses túnel de Expo, también necesitas túnel para el backend
 */
export const TUNNEL_SERVER_URL = 'https://c3508bc55266.ngrok-free.app'; // URL de ngrok
// export const TUNNEL_SERVER_URL = null; // Descomenta esta línea para deshabilitar el túnel

/**
 * Obtener URL final del servidor
 */
export const getFinalServerUrl = () => {
  // Prioridad 1: Túnel (para modo túnel de Expo)
  if (TUNNEL_SERVER_URL) {
    return TUNNEL_SERVER_URL;
  }
  
  // Prioridad 2: Configuración manual (para red local)
  if (MANUAL_SERVER_URL) {
    return MANUAL_SERVER_URL;
  }
  
  // Prioridad 3: Detección automática
  return getServerUrl();
};

export default {
  getServerUrl: getFinalServerUrl,
  configs: SERVER_CONFIGS
};