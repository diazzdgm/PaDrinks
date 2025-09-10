import { Dimensions, PixelRatio } from 'react-native';

// Obtener dimensiones de la pantalla
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Matriz de dispositivos de referencia con pesos por prioridad
const REFERENCE_DEVICES = {
  'iphone-se': { 
    width: 568, 
    height: 320, 
    weight: 0.15,
    aspectRatio: 1.775,
    category: 'phone-small' 
  },
  'iphone-14-pro-max': { 
    width: 932, 
    height: 430, 
    weight: 0.4,
    aspectRatio: 2.167,
    category: 'phone-large' 
  },
  'pixel-8-pro': { 
    width: 891, 
    height: 412, 
    weight: 0.4,
    aspectRatio: 2.162,
    category: 'phone-large' 
  },
  'ipad': { 
    width: 1024, 
    height: 768, 
    weight: 0.25,
    aspectRatio: 1.333,
    category: 'tablet' 
  }
};

// Dimensiones base calculadas como promedio ponderado
const calculateBaseDimensions = () => {
  let totalWeightedWidth = 0;
  let totalWeightedHeight = 0;
  let totalWeight = 0;
  
  Object.values(REFERENCE_DEVICES).forEach(device => {
    totalWeightedWidth += device.width * device.weight;
    totalWeightedHeight += device.height * device.weight;
    totalWeight += device.weight;
  });
  
  return {
    width: totalWeightedWidth / totalWeight,
    height: totalWeightedHeight / totalWeight
  };
};

const baseDimensions = calculateBaseDimensions();
const BASE_WIDTH = baseDimensions.width;   // ~845 (promedio ponderado)
const BASE_HEIGHT = baseDimensions.height; // ~458 (promedio ponderado)

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
 * Obtiene el dispositivo de referencia más cercano al actual
 * @returns {object} - Dispositivo de referencia más cercano
 */
const getClosestReferenceDevice = () => {
  const currentAspectRatio = SCREEN_WIDTH / SCREEN_HEIGHT;
  const currentSize = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT);
  
  let closestDevice = REFERENCE_DEVICES['pixel-8-pro']; // fallback
  let smallestDiff = Infinity;
  
  Object.values(REFERENCE_DEVICES).forEach(device => {
    const aspectDiff = Math.abs(currentAspectRatio - device.aspectRatio);
    const sizeDiff = Math.abs(currentSize - Math.max(device.width, device.height)) / 1000;
    const totalDiff = aspectDiff + sizeDiff;
    
    if (totalDiff < smallestDiff) {
      smallestDiff = totalDiff;
      closestDevice = device;
    }
  });
  
  return closestDevice;
};

/**
 * Escala inteligente que considera relación de aspecto y dispositivo más cercano
 * @param {number} size - Tamaño base en pixels
 * @returns {number} - Tamaño escalado
 */
export const scale = (size) => {
  const shortDimension = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
  const baseShortDimension = Math.min(BASE_WIDTH, BASE_HEIGHT);
  
  // Escalado base
  let scaledSize = (shortDimension / baseShortDimension) * size;
  
  // Ajuste por relación de aspecto
  const currentAspectRatio = SCREEN_WIDTH / SCREEN_HEIGHT;
  const baseAspectRatio = BASE_WIDTH / BASE_HEIGHT;
  
  if (currentAspectRatio > 2.2) {
    // Ultra-wide phones: reducir un poco
    scaledSize *= 0.92;
  } else if (currentAspectRatio < 1.8) {
    // Tablets más cuadradas: aumentar un poco  
    scaledSize *= 1.08;
  }
  
  return scaledSize;
};

/**
 * Escala por tipo de contenido con comportamientos específicos
 * @param {number} size - Tamaño base en pixels
 * @param {string} contentType - Tipo de contenido: 'hero', 'interactive', 'text', 'spacing', 'icon'
 * @returns {number} - Tamaño escalado según el tipo
 */
export const scaleByContent = (size, contentType = 'default') => {
  const baseScale = scale(size);
  const fontScale = PixelRatio.getFontScale();
  
  // Detección específica por dimensiones reales de los dispositivos probados
  const screenSize = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT);
  let deviceMultiplier = 1.0;
  
  if (screenSize >= 1280) {
    // Pixel Tablet (1600x1024 o similar) - reducir más para evitar texto roto
    deviceMultiplier = 0.75;
  } else if (screenSize >= 850) {
    // Pixel 8 Pro (891x412) - hacer elementos AÚN más grandes
    deviceMultiplier = 1.35;
  } else if (screenSize < 700) {
    // Pixel 3 y dispositivos pequeños
    deviceMultiplier = 0.95;
  }
  
  switch (contentType) {
    case 'hero':
      // Logos y elementos principales: escalan más agresivamente
      return baseScale * 1.15 * deviceMultiplier;
      
    case 'interactive':
      // Botones: mantienen mínimos de accesibilidad (44pt)
      return Math.max(baseScale * deviceMultiplier, 44);
      
    case 'text':
      // Texto: respeta configuraciones de accesibilidad del sistema
      // Multiplicador extra para textos en Pixel 8 Pro
      const textMultiplier = (screenSize >= 850 && screenSize < 1280) ? 1.15 : 1.0;
      return Math.min(baseScale * fontScale * deviceMultiplier * textMultiplier, size * 1.8);
      
    case 'spacing':
      // Espaciado: escala moderadamente
      return baseScale * 0.85 * deviceMultiplier;
      
    case 'icon':
      // Iconos: escalado conservador
      return baseScale * 0.9 * deviceMultiplier;
      
    default:
      return baseScale * deviceMultiplier;
  }
};

/**
 * Escala para texto con límites mínimo y máximo (mantiene compatibilidad)
 * @param {number} size - Tamaño base del texto
 * @param {number} minSize - Tamaño mínimo
 * @param {number} maxSize - Tamaño máximo
 * @returns {number} - Tamaño escalado del texto
 */
export const scaleText = (size, minSize = size * 0.8, maxSize = size * 1.5) => {
  return scaleByContent(size, 'text');
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
 * Detecta el tipo de dispositivo basado en dimensiones y aspecto
 * @returns {string} - 'phone-small' | 'phone-large' | 'phone-ultrawide' | 'tablet-square' | 'tablet-wide'
 */
export const getDeviceType = () => {
  const screenSize = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT);
  const aspectRatio = SCREEN_WIDTH / SCREEN_HEIGHT;
  
  if (screenSize < 750) {
    return 'phone-small';
  } else if (screenSize < 1100) {
    return aspectRatio > 2.0 ? 'phone-ultrawide' : 'phone-large';
  } else {
    return aspectRatio < 1.8 ? 'tablet-square' : 'tablet-wide';
  }
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
  const deviceType = getDeviceType();
  return deviceType === 'tablet-square' || deviceType === 'tablet-wide';
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
      return scaleByContent(sizes.small, 'spacing');
    case 'phone-large':
    case 'phone-ultrawide':
      return scaleByContent(sizes.medium, 'spacing');
    case 'tablet-square':
    case 'tablet-wide':
      return scaleByContent(sizes.large, 'spacing');
    default:
      return scaleByContent(sizes.medium, 'spacing');
  }
};

/**
 * Información del dispositivo actual para debugging
 * @returns {object} - Información completa del dispositivo
 */
export const getDeviceInfo = () => {
  const closestDevice = getClosestReferenceDevice();
  const currentAspectRatio = SCREEN_WIDTH / SCREEN_HEIGHT;
  
  return {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    type: getDeviceType(),
    aspectRatio: currentAspectRatio,
    pixelRatio: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale(),
    isSmall: isSmallDevice(),
    isTablet: isTablet(),
    closestReference: closestDevice,
    scaleFactorWidth: SCREEN_WIDTH / BASE_WIDTH,
    scaleFactorHeight: SCREEN_HEIGHT / BASE_HEIGHT,
    scaleFactorMin: Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / Math.min(BASE_WIDTH, BASE_HEIGHT),
    baseDimensions: { width: BASE_WIDTH, height: BASE_HEIGHT },
  };
};

// Breakpoints mejorados para diferentes dispositivos
export const BREAKPOINTS = {
  PHONE_SMALL: 750,     // iPhone SE, Android compactos (ajustado upward)
  PHONE_LARGE: 1100,    // iPhone Pro Max, Pixel Pro (mejor separación)
  TABLET_SMALL: 1400,   // iPad Mini, tablets pequeñas (nueva categoría)  
  TABLET_LARGE: 1400,   // iPad Pro, tablets grandes
  ASPECT_ULTRAWIDE: 2.0, // Relación de aspecto para ultra-wide
  ASPECT_SQUARE: 1.8,    // Relación de aspecto para tablets cuadradas
};

// Valores responsive comunes usando el nuevo sistema
export const RESPONSIVE = {
  // Espaciado
  spacing: {
    xs: scaleByContent(4, 'spacing'),
    sm: scaleByContent(8, 'spacing'), 
    md: scaleByContent(16, 'spacing'),
    lg: scaleByContent(24, 'spacing'),
    xl: scaleByContent(32, 'spacing'),
    xxl: scaleByContent(48, 'spacing'),
  },
  
  // Tamaños de fuente
  fontSize: {
    small: scaleByContent(14, 'text'),
    medium: scaleByContent(16, 'text'),
    large: scaleByContent(18, 'text'),
    xlarge: scaleByContent(24, 'text'),
    xxlarge: scaleByContent(32, 'text'),
    title: scaleByContent(48, 'text'),
  },
  
  // Tamaños de botón
  button: {
    height: scaleByContent(50, 'interactive'),
    paddingHorizontal: scaleByContent(25, 'spacing'),
    paddingVertical: scaleByContent(12, 'spacing'),
    borderRadius: scaleByContent(15, 'spacing'),
  },
  
  // Tamaños de logo/imagen
  logo: {
    small: scaleByContent(120, 'hero'),
    medium: scaleByContent(180, 'hero'),
    large: scaleByContent(220, 'hero'),
  },
  
  // Elementos de UI
  ui: {
    iconSize: scaleByContent(24, 'icon'),
    touchableSize: scaleByContent(44, 'interactive'),
  }
};