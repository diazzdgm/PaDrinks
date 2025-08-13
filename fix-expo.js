const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Script de reparación de Expo para Windows\n');
console.log('========================================\n');

// Función para ejecutar comandos
function runCommand(command, description) {
  console.log(`📍 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', shell: true });
    console.log(`✅ ${description} - Completado\n`);
    return true;
  } catch (error) {
    console.error(`❌ Error en: ${description}`);
    console.error(error.message + '\n');
    return false;
  }
}

// Función para verificar archivo/carpeta
function checkPath(pathToCheck, type = 'file') {
  const exists = fs.existsSync(pathToCheck);
  const icon = exists ? '✅' : '❌';
  const status = exists ? 'Encontrado' : 'No encontrado';
  console.log(`${icon} ${type}: ${pathToCheck} - ${status}`);
  return exists;
}

// 1. Verificar versión de Node.js
console.log('1️⃣ Verificando versión de Node.js...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  console.log(`   Node.js: ${nodeVersion}`);
  
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion < 18) {
    console.warn('⚠️  Advertencia: Se recomienda Node.js 18 o superior para Expo SDK 53\n');
  } else {
    console.log('✅ Versión de Node.js compatible\n');
  }
} catch (error) {
  console.error('❌ No se pudo verificar la versión de Node.js\n');
}

// 2. Verificar npm
console.log('2️⃣ Verificando npm...');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  console.log(`   npm: ${npmVersion}`);
  console.log('✅ npm está instalado\n');
} catch (error) {
  console.error('❌ npm no está instalado o no está en el PATH\n');
  process.exit(1);
}

// 3. Verificar estructura del proyecto
console.log('3️⃣ Verificando estructura del proyecto...');
checkPath('package.json', 'Archivo');
checkPath('App.js', 'Archivo');
checkPath('node_modules', 'Carpeta');
checkPath('.expo', 'Carpeta');
console.log();

// 4. Limpiar caché si es necesario
console.log('4️⃣ Limpiando caché...');
if (fs.existsSync('.expo')) {
  runCommand('rm -rf .expo', 'Eliminando carpeta .expo');
}

// 5. Verificar y reinstalar dependencias
console.log('5️⃣ Verificando dependencias...');
if (fs.existsSync('node_modules')) {
  console.log('   Encontrada carpeta node_modules');
  
  const response = process.argv.includes('--force') ? 'y' : 'n';
  if (response === 'y' || process.argv.includes('--reinstall')) {
    console.log('   Reinstalando dependencias...');
    runCommand('rm -rf node_modules package-lock.json', 'Eliminando node_modules');
    runCommand('npm install --legacy-peer-deps', 'Instalando dependencias');
  } else {
    console.log('   Saltando reinstalación (usa --force para forzar)\n');
  }
} else {
  runCommand('npm install --legacy-peer-deps', 'Instalando dependencias');
}

// 6. Verificar instalación de Expo
console.log('6️⃣ Verificando instalación de Expo...');
const expoPaths = [
  path.join('node_modules', 'expo'),
  path.join('node_modules', '@expo', 'cli'),
  path.join('node_modules', '.bin', 'expo.cmd'),
  path.join('node_modules', '.bin', 'expo')
];

let expoFound = false;
for (const expoPath of expoPaths) {
  if (checkPath(expoPath)) {
    expoFound = true;
  }
}

if (!expoFound) {
  console.log('\n⚠️  Expo no está correctamente instalado');
  runCommand('npm install expo@~53.0.20 --save', 'Instalando Expo SDK 53');
  runCommand('npm install @expo/cli --save', 'Instalando Expo CLI');
}
console.log();

// 7. Verificar que npx expo funciona
console.log('7️⃣ Verificando comando expo...');
try {
  const expoVersion = execSync('npx expo --version', { encoding: 'utf-8' }).trim();
  console.log(`✅ Expo CLI versión: ${expoVersion}\n`);
} catch (error) {
  console.error('❌ No se puede ejecutar expo con npx');
  console.log('   Intentando instalar globalmente como respaldo...');
}

// 8. Crear app.json si no existe
console.log('8️⃣ Verificando app.json...');
if (!fs.existsSync('app.json')) {
  console.log('   Creando app.json básico...');
  const appJson = {
    "expo": {
      "name": "PaDrinks",
      "slug": "padrinks",
      "version": "1.0.0",
      "orientation": "portrait",
      "icon": "./assets/icon.png",
      "userInterfaceStyle": "light",
      "newArchEnabled": true,
      "platforms": ["ios", "android", "web"],
      "splash": {
        "image": "./assets/splash-icon.png",
        "resizeMode": "contain",
        "backgroundColor": "#ffffff"
      },
      "assetBundlePatterns": [
        "**/*"
      ],
      "ios": {
        "supportsTablet": true
      },
      "android": {
        "adaptiveIcon": {
          "foregroundImage": "./assets/adaptive-icon.png",
          "backgroundColor": "#ffffff"
        },
        "edgeToEdgeEnabled": true
      },
      "web": {
        "favicon": "./assets/favicon.png"
      },
      "plugins": [
        "expo-font"
      ]
    }
  };
  
  fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
  console.log('✅ app.json creado\n');
} else {
  console.log('✅ app.json existe\n');
}

// 9. Instrucciones finales
console.log('\n========================================');
console.log('✅ Reparación completada\n');
console.log('📝 Próximos pasos:');
console.log('   1. Ejecuta: npm start');
console.log('   2. Si falla, ejecuta: node start-expo.js');
console.log('   3. Para limpiar caché: npm run start:clear');
console.log('   4. Para modo túnel: npm run start:tunnel\n');
console.log('💡 Consejos adicionales:');
console.log('   - Si usas antivirus, añade node_modules a excepciones');
console.log('   - Asegúrate de que el puerto 19000 esté libre');
console.log('   - En Windows Defender, permite Node.js en el firewall');
console.log('\n👍 ¡Buena suerte con tu proyecto!');