const { supabase } = require('../config/supabaseClient');

async function verificarUsuario(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.replace(/^Bearer\s+/i, '').trim() : '';

  if (!token) {
    return res.status(401).send('Tenés que iniciar sesión');
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      if (error && error.status >= 500) {
        console.error('Error al verificar el token de Supabase:', error);
        return res.status(503).send('No se pudo verificar la sesión');
      }
      return res.status(401).send('Sesión inválida o vencida');
    }

    req.usuario = data.user;
    req.accessToken = token;
    return next();
  } catch (error) {
    console.error('Error de conexión al verificar la sesión:', error);
    return res.status(503).send('No se pudo verificar la sesión');
  }
}

module.exports = verificarUsuario;