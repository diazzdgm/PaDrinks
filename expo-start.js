#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Ruta al CLI de Expo
const expoCli = path.join(__dirname, 'node_modules', '@expo', 'cli', 'build', 'bin', 'cli');

// Argumentos para pasar al CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  args.push('start');
}

console.log('Starting Expo with node directly...');

// Ejecutar el CLI de Expo
const child = spawn('node', [expoCli, ...args], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Error starting Expo:', err);
  process.exit(1);
});