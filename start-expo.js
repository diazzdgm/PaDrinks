const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Función para verificar si un módulo existe
function moduleExists(modulePath) {
  try {
    require.resolve(modulePath);
    return true;
  } catch (e) {
    return false;
  }
}

// Función para encontrar el ejecutable de Expo
function findExpoExecutable() {
  const possiblePaths = [
    path.join(__dirname, 'node_modules', '.bin', 'expo.cmd'),
    path.join(__dirname, 'node_modules', '.bin', 'expo'),
    path.join(__dirname, 'node_modules', 'expo', 'bin', 'cli.js'),
    path.join(__dirname, 'node_modules', '@expo', 'cli', 'build', 'bin', 'cli'),
  ];

  for (const expoPath of possiblePaths) {
    if (fs.existsSync(expoPath)) {
      console.log(`✓ Expo encontrado en: ${expoPath}`);
      return expoPath;
    }
  }

  return null;
}

// Función principal para iniciar Expo
function startExpo() {
  console.log('🚀 Iniciando servidor de desarrollo de Expo...\n');
  console.log(`📁 Directorio actual: ${__dirname}`);
  console.log(`🖥️  Sistema operativo: ${process.platform}`);
  console.log(`📦 Node.js versión: ${process.version}\n`);

  // Verificar si Expo está instalado
  if (!moduleExists('expo')) {
    console.error('❌ Error: Expo no está instalado.');
    console.log('Ejecuta: npm install expo');
    process.exit(1);
  }

  // Encontrar el ejecutable de Expo
  const expoPath = findExpoExecutable();
  
  if (!expoPath) {
    console.error('❌ Error: No se puede encontrar el ejecutable de Expo.');
    console.log('Intentando usar npx expo directamente...\n');
    
    // Intentar con npx como fallback
    const npxExpo = spawn('npx', ['expo', 'start'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    npxExpo.on('error', (error) => {
      console.error('❌ Error al ejecutar npx expo:', error.message);
      process.exit(1);
    });

    npxExpo.on('exit', (code) => {
      process.exit(code);
    });

    return;
  }

  // Determinar el comando según el sistema operativo
  let command;
  let args;

  if (process.platform === 'win32') {
    // En Windows, usar node para ejecutar el script
    if (expoPath.endsWith('.cmd')) {
      command = expoPath;
      args = ['start'];
    } else {
      command = 'node';
      args = [expoPath, 'start'];
    }
  } else {
    command = 'node';
    args = [expoPath, 'start'];
  }

  console.log(`📍 Ejecutando: ${command} ${args.join(' ')}\n`);

  // Ejecutar Expo
  const expo = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { 
      ...process.env, 
      FORCE_COLOR: '1',
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });

  expo.on('error', (error) => {
    console.error('❌ Error al iniciar Expo:', error.message);
    console.log('\n🔧 Sugerencias:');
    console.log('1. Ejecuta: npm install');
    console.log('2. Ejecuta: npx expo doctor');
    console.log('3. Intenta: npm start:clear');
    process.exit(1);
  });

  expo.on('exit', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Expo terminó con código de error: ${code}`);
    }
    process.exit(code);
  });
}

// Manejar señales de interrupción
process.on('SIGINT', () => {
  console.log('\n👋 Deteniendo servidor de Expo...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Deteniendo servidor de Expo...');
  process.exit(0);
});

// Iniciar Expo
startExpo();