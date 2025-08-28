import { RESPONSIVE } from '../utils/responsive';

export const theme = {
  colors: {
    primary: '#FF7F11',        // Naranja
    secondary: '#A8E10C',      // Verde lima
    accent: '#0EBDE1',         // Azul cielo
    text: '#2E2E2E',           // Texto principal
    textSecondary: '#666666',  // Texto secundario
    background: '#F8F6F0',     // Papel
    paper: '#FFFFFF',          // Blanco
    lines: '#E3F2FD',          // Líneas cuaderno
    shadow: '#D0D0D0',         // Sombras
    
    // Post-its
    postItYellow: '#FFE082',
    postItGreen: '#C8E6C9',
    postItPink: '#F8BBD9',
    postItBlue: '#BBDEFB',
    
    // Estados
    success: '#4CAF50',
    error: '#D32F2F',
    warning: '#F57C00',
    info: '#2196F3',
  },
  
  fonts: {
    primary: 'Kalam-Regular',
    primaryBold: 'Kalam-Bold',
    sizes: {
      small: RESPONSIVE.fontSize.small,
      medium: RESPONSIVE.fontSize.medium,
      large: RESPONSIVE.fontSize.large,
      xlarge: RESPONSIVE.fontSize.xlarge,
      xxlarge: RESPONSIVE.fontSize.xxlarge,
      title: RESPONSIVE.fontSize.title,
    },
    weights: {
      normal: '400',                 
      bold: '700',                   
    },
  },
  
  spacing: {
    xs: RESPONSIVE.spacing.xs,
    sm: RESPONSIVE.spacing.sm,
    md: RESPONSIVE.spacing.md,
    lg: RESPONSIVE.spacing.lg,
    xl: RESPONSIVE.spacing.xl,
    xxl: RESPONSIVE.spacing.xxl,
  },
  
  borderRadius: {
    small: RESPONSIVE.spacing.sm,
    medium: RESPONSIVE.spacing.md * 0.9,
    large: RESPONSIVE.spacing.lg * 1.0,
    postIt: `0 ${RESPONSIVE.spacing.md}px ${RESPONSIVE.spacing.md}px ${RESPONSIVE.spacing.md}px`,
  },
  
  shadows: {
    postIt: '3px 3px 8px rgba(0,0,0,0.2)',
    card: '2px 2px 5px rgba(0,0,0,0.1)',
    elevated: '5px 8px 15px rgba(0,0,0,0.3)',
  },
};
