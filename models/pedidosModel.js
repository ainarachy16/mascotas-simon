const { createAuthenticatedClient } = require('../config/supabaseClient');

function errorDePedido(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

async function crearPedido(accessToken, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw errorDePedido('El carrito está vacío');
  }

  const itemsValidados = items.map((item) => {
    if (
      !Number.isSafeInteger(item?.producto_id) ||
      item.producto_id < 1 ||
      item.producto_id > 2147483647
    ) {
      throw errorDePedido('El carrito contiene un producto inválido');
    }
    if (
      !Number.isSafeInteger(item?.cantidad) ||
      item.cantidad < 1 ||
      item.cantidad > 2147483647
    ) {
      throw errorDePedido('La cantidad debe ser un entero positivo');
    }
    return { producto_id: item.producto_id, cantidad: item.cantidad };
  });

  const supabase = createAuthenticatedClient(accessToken);
  const { data, error } = await supabase.rpc('crear_pedido', {
    p_items: itemsValidados
  });

  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw errorDePedido(
        'Falta instalar la migración de pedidos en Supabase (db/migracion_supabase.sql)',
        503
      );
    }
    if (error.code === 'P0001') {
      throw errorDePedido(error.message);
    }
    throw error;
  }

  if (!data) {
    throw new Error('Supabase no devolvió el pedido creado');
  }

  return data;
}

module.exports = { crearPedido };
