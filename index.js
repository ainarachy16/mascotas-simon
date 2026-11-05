// SERVIDOR
// Enciende Express, pone los middlewares y monta las rutas.
// Funciona igual en tu compu (npm start) y en Vercel.
const express = require('express');
const path = require('path');
const rutas = require('./routes/tiendaRoutes');

const app = express();


app.use(express.json({ limit: '32kb' }));              // body en JSON
app.use(express.static(path.join(__dirname, 'public'))); // el front (en Vercel lo sirve Vercel)

app.use('/', rutas);

app.use((req, res) => res.status(404).send('Ruta no encontrada'));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.type === 'entity.parse.failed') {
    return res.status(400).send('El cuerpo de la solicitud no es JSON válido');
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).send('La solicitud es demasiado grande');
  }

  console.error('Error no controlado en la solicitud:', error);
  return res.status(500).send('Error interno del servidor');
});

// En tu compu levantamos el servidor. En Vercel no hace falta:
// Vercel toma la app exportada y la ejecuta por su cuenta.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('Tienda en http://localhost:' + PORT));
}

module.exports = app;
