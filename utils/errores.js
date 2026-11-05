// ERRORES CON CODIGO
// Un error comun llega al controller como 500 (culpa del servidor).
// Estos traen su propio codigo para que el controller responda el correcto.

// Todavia no esta programado (501 = Not Implemented)
function faltaImplementar(funcion, donde) {
  const e = new Error('Falta implementar: ' + funcion + ' (' + donde + ')');
  e.status = 501;
  return e;
}

module.exports = { faltaImplementar };
