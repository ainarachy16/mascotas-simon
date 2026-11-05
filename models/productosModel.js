const { supabase } = require('../config/supabaseClient');

function verificarErrorDeEsquema(error) {
  if (!['42703', 'PGRST201', 'PGRST202', 'PGRST205'].includes(error?.code)) {
    return error;
  }

  const errorMigracion = new Error(
    'La base Supabase todavía no tiene el esquema de la tienda. Ejecutá db/migracion_supabase.sql.'
  );
  errorMigracion.status = 503;
  errorMigracion.cause = error;
  return errorMigracion;
}

async function obtenerCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre:nombres')
    .order('nombres');

  if (error) throw verificarErrorDeEsquema(error);
  return data || [];
}

async function obtenerProductos(categoriaId) {
  let consulta = supabase
    .from('productos')
    .select('id, nombre, descripcion, precio, stock, imagen_url, categoria_id, categorias!productos_categoria_id_fkey (nombre:nombres)')
    .eq('activo', true)
    .order('nombre');

  if (categoriaId !== null) {
    consulta = consulta.eq('categoria_id', categoriaId);
  }

  const { data, error } = await consulta;
  if (error) throw verificarErrorDeEsquema(error);
  return data || [];
}

module.exports = { obtenerCategorias, obtenerProductos };