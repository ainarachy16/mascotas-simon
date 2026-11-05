// CONTROLLER DE USUARIOS
const model = require('../models/authModel');

async function registro(req, res) {
  const { email, password, nombre } = req.body || {};
  const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    correo.length > 254 ||
    !nombreLimpio ||
    nombreLimpio.length > 100 ||
    typeof password !== 'string' ||
    password.length < 6
  ) {
    return res.status(400).send('Email, nombre o contraseña inválidos');
  }

  try {
    const usuario = await model.registrar(correo, password, nombreLimpio);
    res.status(201).json({ id: usuario.id, email: usuario.email });
  } catch (error) {
    if (error.status && error.status < 500) {
      return res.status(error.status).send(error.message);
    }
    console.error('Error al registrar usuario:', error);
    res.status(500).send('No se pudo registrar. Revisá la configuración de Supabase.');
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || typeof password !== 'string' || !password) {
    return res.status(400).send('Faltan datos');
  }

  try {
    const token = await model.iniciarSesion(correo, password);
    if (!token) return res.status(401).send('Email o contraseña incorrectos');
    res.status(200).json({ token });
  } catch (error) {
    if (error.status && error.status < 500) {
      return res.status(error.status).send(error.message);
    }
    console.error('Error al iniciar sesión:', error);
    res.status(500).send('Error al iniciar sesion');
  }
}

module.exports = { registro, login };
