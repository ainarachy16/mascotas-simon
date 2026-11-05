const { createUnauthenticatedClient } = require('../config/supabaseClient');

async function registrar(email, password, nombre) {
  const supabase = createUnauthenticatedClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre } }
  });

  if (error) throw error;
  if (!data.user) throw new Error('Supabase no devolvió el usuario registrado');
  return data.user;
}

async function iniciarSesion(email, password) {
  const supabase = createUnauthenticatedClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === 'email_not_confirmed') {
      const confirmationError = new Error('Confirmá tu email antes de iniciar sesión');
      confirmationError.status = 403;
      throw confirmationError;
    }
    if ([400, 401, 422].includes(error.status)) return null;
    throw error;
  }

  if (!data.session?.access_token) {
    throw new Error('Supabase no devolvió una sesión válida');
  }

  return data.session.access_token;
}

module.exports = { registrar, iniciarSesion };
