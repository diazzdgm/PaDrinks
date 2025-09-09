const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ignorar la carpeta backend para evitar conflictos y directorios problemáticos de Windows
config.resolver.blockList = [
  // Ignorar node_modules del backend
  /backend\/node_modules\/.*/,
  /backend\/\..*/, // Ignorar archivos ocultos del backend
  // Ignorar directorios MCP servers
  /mcp-servers\/.*/,
  // Ignorar directorios problemáticos en Windows
  /node_modules\/\.bin\/.*/,
  /\.bin$/,
  /\.bin\/.*/,
];

// Configurar watchFolders para no incluir backend
config.watchFolders = [
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'assets'),
  path.resolve(__dirname, 'node_modules'),
];

// Configuraciones específicas para Windows
if (process.platform === 'win32') {
  // Deshabilitar watchman en Windows para evitar problemas de permisos
  config.watchFolders = config.watchFolders.filter(folder => 
    !folder.includes('.bin')
  );
}

module.exports = config;