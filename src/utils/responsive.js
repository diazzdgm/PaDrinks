import { Dimensions, PixelRatio } from 'react-native';

// Obtener dimensiones de la pantalla
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensiones de referencia (Pixel 8 Pro en landscape donde se ve perfecto)
const BASE_WIDTH = 891;  // Pixel 8 Pro landscape width
const BASE_HEIGHT = 412; // Pixel 8 Pro landscape height

/**
 * Escala horizontal basada en el ancho de pantalla
 * @param {number} size - Tamaño base en pixels
 * @returns {number} - Tamaño escalado
 */
export const scaleWidth = (size) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Escala vertical basada en la altura de pantalla
 * @param {number} size - Tamaño base en pixels
 * @returns {number} - Tamaño escalado
 */
export const scaleHeight = (size) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Escala basada en la dimensión más pequeña (responsive más equilibrado)
 * @param {number} size - Tamaño base en pixels
 * @returns {number} - Tamaño escalado
 */
export const scale = (size) => {
  const shortDimension = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
  const baseShortDimension = Math.min(BASE_WIDTH, BASE_HEIGHT);
  return (shortDimension / baseShortDimension) * size;
};

/**
 * Escala para texto con límites mínimo y máximo
 * @param {number} size - Tamaño base del texto
 * @param {number} minSize - Tamaño mínimo
 * @param {number} maxSize - Tamaño máximo
 * @returns {number} - Tamaño escalado del texto
 */
export const scaleText = (size, minSize = size * 0.8, maxSize = size * 1.5) => {
  const scaledSize = scale(size);
  return Math.min(Math.max(scaledSize, minSize), maxSize);
};

/**
 * Escala moderada para elementos que no deben crecer/decrecer demasiado
 * @param {number} size - Tamaño base en pixels
 * @param {number} factor - Factor de escalado (0.5 = escala 50%, 1 = escala normal)
 * @returns {number} - Tamaño escalado moderado
 */
export const scaleModerate = (size, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};

/**
 * Detecta el tipo de dispositivo basado en dimensiones
 * @returns {string} - 'phone-small' | 'phone-large' | 'tablet'
 */
export const getDeviceType = () => {
  const screenSize = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT);
  
  if (screenSize < 700) return 'phone-small';
  if (screenSize < 1000) return 'phone-large'; 
  return 'tablet';
};

/**
 * Detecta si es un dispositivo pequeño
 * @returns {boolean}
 */
export const isSmallDevice = () => {
  return getDeviceType() === 'phone-small';
};

/**
 * Detecta si es una tablet
 * @returns {boolean}
 */
export const isTablet = () => {
  return getDeviceType() === 'tablet';
};

/**
 * Retorna espaciado responsivo basado en el dispositivo
 * @param {object} sizes - { small: number, medium: number, large: number }
 * @returns {number} - Espaciado apropiado
 */
export const getResponsiveSpacing = (sizes) => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'phone-small':
      return scale(sizes.small);
    case 'phone-large':
      return scale(sizes.medium);
    case 'tablet':
      return scale(sizes.large);
    default:
      return scale(sizes.medium);
  }
};

/**
 * Información del dispositivo actual para debugging
 * @returns {object} - Información completa del dispositivo
 */
export const getDeviceInfo = () => {
  return {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    type: getDeviceType(),
    pixelRatio: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale(),
    isSmall: isSmallDevice(),
    isTablet: isTablet(),
    scaleFactorWidth: SCREEN_WIDTH / BASE_WIDTH,
    scaleFactorHeight: SCREEN_HEIGHT / BASE_HEIGHT,
    scaleFactorMin: Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / Math.min(BASE_WIDTH, BASE_HEIGHT),
  };
};

// Breakpoints para diferentes dispositivos
export const BREAKPOINTS = {
  PHONE_SMALL: 700,   // iPhone SE, Android compactos
  PHONE_LARGE: 1000,  // iPhone Pro Max, Pixel Pro
  TABLET: 1000,       // iPads, Android tablets
};

// Valores responsive comunes
export const RESPONSIVE = {
  // Espaciado
  spacing: {
    xs: scale(4),
    sm: scale(8), 
    md: scale(16),
    lg: scale(24),
    xl: scale(32),
    xxl: scale(48),
  },
  
  // Tamaños de fuente
  fontSize: {
    small: scaleText(14, 12, 18),
    medium: scaleText(16, 14, 20),
    large: scaleText(18, 16, 24),
    xlarge: scaleText(24, 20, 32),
    xxlarge: scaleText(32, 26, 42),
    title: scaleText(48, 36, 64),
  },
  
  // Tamaños de botón
  button: {
    height: scaleHeight(50),
    paddingHorizontal: scaleWidth(25),
    paddingVertical: scaleHeight(12),
    borderRadius: scale(15),
  },
  
  // Tamaños de logo/imagen
  logo: {
    small: scale(120),
    medium: scale(180),
    large: scale(220),
  },
  
  // Elementos de UI
  ui: {
    iconSize: scaleModerate(24, 0.3),
    touchableSize: Math.max(scale(44), 44), // Mínimo 44pt para touch
  }
};