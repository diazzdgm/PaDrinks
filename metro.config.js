const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ignorar la carpeta backend para evitar conflictos
config.resolver.blockList = [
  // Ignorar node_modules del backend
  /backend\/node_modules\/.*/,
  /backend\/\..*/, // Ignorar archivos ocultos del backend
];

// Configurar watchFolders para no incluir backend
config.watchFolders = [
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'assets'),
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;