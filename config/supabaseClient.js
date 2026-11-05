// CONEXION A SUPABASE
// El cliente de catálogo es compartido; Auth y las operaciones por usuario usan
// clientes independientes para no mezclar sesiones entre solicitudes.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (
  !supabaseUrl ||
  !supabaseKey ||
  /xxxx|replace|placeholder/i.test(supabaseUrl) ||
  /tu_|replace|placeholder/i.test(supabaseKey)
) {
  throw new Error(
    'Falta configurar SUPABASE_URL y SUPABASE_KEY en .env (o en las variables de entorno del deploy).'
  );
}

try {
  new URL(supabaseUrl);
} catch {
  throw new Error('SUPABASE_URL debe ser una URL válida de tu proyecto Supabase.');
}

function createUnauthenticatedClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

const supabase = createUnauthenticatedClient();

function createAuthenticatedClient(accessToken) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}

module.exports = { supabase, createAuthenticatedClient, createUnauthenticatedClient };
