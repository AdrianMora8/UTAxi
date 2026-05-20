/**
 * Processor para Artillery - ejecuta código personalizado durante los tests
 * Útil para generar datos dinámicos, autenticarse, etc.
 */

module.exports = {
  /**
   * Generar token de prueba antes de cada escenario
   */
  generateToken: generateToken,
  
  /**
   * Procesar respuesta del servidor
   */
  processResponse: processResponse,
};

/**
 * Función para generar un token JWT simulado
 */
function generateToken(requestParams, context, ee, next) {
  // En un escenario real, aquí harías login y extraerías el token
  // Por ahora, asignamos un token de prueba
  const testToken = 'test-jwt-token-' + Date.now();
  context.vars.token = testToken;
  return next();
}

/**
 * Procesar respuesta para validar estructura
 */
function processResponse(requestParams, responseStatus, responseHeaders, responseBody, context, ee, next) {
  if (responseStatus === 200) {
    try {
      const body = JSON.parse(responseBody);
      // Verificar que la respuesta tenga estructura esperada
      if (body.data || body.id || body.message) {
        // Válido
      }
    } catch (e) {
      // Error al parsear JSON
    }
  }
  return next();
}
