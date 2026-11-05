// CONTROLLER DE PRODUCTOS
const model = require('../models/productosModel');

async function verCategorias(req, res) {
  try {
    const categorias = await model.obtenerCategorias();
    res.status(200).json(categorias);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    console.error('Error al obtener las categorías:', error);
    res.status(500).send('Error al obtener las categorias');
  }
}

// GET /productos  o  GET /productos?categoria=2
async function verProductos(req, res) {
  const valorCategoria = req.query.categoria;
  const categoriaId = valorCategoria === undefined ? null : Number(valorCategoria);

  if (categoriaId !== null && (!Number.isSafeInteger(categoriaId) || categoriaId < 1)) {
    return res.status(400).send('La categoría debe ser un ID entero positivo');
  }

  try {
    const productos = await model.obtenerProductos(categoriaId);
    res.status(200).json(productos);
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    console.error('Error al obtener los productos:', error);
    res.status(500).send('Error al obtener los productos');
  }
}

module.exports = { verCategorias, verProductos };
