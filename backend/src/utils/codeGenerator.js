/**
 * Utilidades para generación y validación de códigos de sala
 */

class CodeGenerator {
  constructor() {
    this.usedCodes = new Set();
    this.codeLength = 6;
  }

  /**
   * Genera un código único de 6 dígitos
   * @returns {string} Código de sala
   */
  generateRoomCode() {
    let code;
    let attempts = 0;
    const maxAttempts = 1000;

    do {
      code = this.generateRandomCode();
      attempts++;
      
      if (attempts > maxAttempts) {
        // Si no podemos generar un código único, limpiar códigos antiguos
        this.cleanupOldCodes();
        code = this.generateRandomCode();
        break;
      }
    } while (this.usedCodes.has(code));

    this.usedCodes.add(code);
    return code;
  }

  /**
   * Genera un código aleatorio de 6 dígitos
   * @returns {string} Código aleatorio
   */
  generateRandomCode() {
    const min = Math.pow(10, this.codeLength - 1);
    const max = Math.pow(10, this.codeLength) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Valida formato de código
   * @param {string} code - Código a validar
   * @returns {boolean} True si es válido
   */
  isValidCodeFormat(code) {
    if (typeof code !== 'string') return false;
    if (code.length !== this.codeLength) return false;
    return /^\d+$/.test(code);
  }

  /**
   * Marca un código como usado
   * @param {string} code - Código a marcar
   */
  markCodeAsUsed(code) {
    this.usedCodes.add(code);
  }

  /**
   * Libera un código para reutilización
   * @param {string} code - Código a liberar
   */
  releaseCode(code) {
    this.usedCodes.delete(code);
  }

  /**
   * Limpia códigos antiguos (llamado cuando no se pueden generar nuevos)
   */
  cleanupOldCodes() {
    // En una implementación real, podrías mantener timestamps de códigos
    // y limpiar solo los que son realmente antiguos
    console.log('⚠️ Cleaning up old room codes due to exhaustion');
    this.usedCodes.clear();
  }

  /**
   * Obtiene estadísticas de códigos
   * @returns {object} Estadísticas
   */
  getStats() {
    const totalPossible = Math.pow(10, this.codeLength) - Math.pow(10, this.codeLength - 1);
    return {
      totalPossible,
      used: this.usedCodes.size,
      available: totalPossible - this.usedCodes.size,
      usagePercentage: (this.usedCodes.size / totalPossible * 100).toFixed(2)
    };
  }
}

// Exportar instancia singleton
module.exports = new CodeGenerator();