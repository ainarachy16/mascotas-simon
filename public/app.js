// ==========================================
// ESTADO DE LA APLICACIÓN
// ==========================================
let categoriaActual = null;
let carrito = cargarCarritoGuardado();
let token = localStorage.getItem('token') || null;
let usuarioEmail = localStorage.getItem('email') || null;
let ultimaLista = [];

function cargarCarritoGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem('carrito') || '[]');
    if (!Array.isArray(guardado)) return [];
    return guardado.filter(item =>
      Number.isSafeInteger(item.producto_id) &&
      Number.isSafeInteger(item.cantidad) &&
      item.cantidad > 0 &&
      typeof item.nombre === 'string' &&
      Number.isFinite(Number(item.precio))
    );
  } catch (error) {
    console.error('No se pudo leer el carrito guardado:', error);
    return [];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  actualizarSesion();
  cargarCategorias();
  cargarProductos();
  actualizarContadorCarrito();
});

// ==========================================
// 1. CATEGORÍAS Y PRODUCTOS
// ==========================================
async function cargarCategorias() {
  try {
    const res = await fetch('/categorias');
    if (!res.ok) throw new Error(await res.text());
    const categorias = await res.json();
    const container = document.getElementById('categorias-container');

    container.replaceChildren();
    const todos = document.createElement('button');
    todos.type = 'button';
    todos.className = `filtro-btn ${categoriaActual === null ? 'activo' : ''}`;
    todos.dataset.categoria = '';
    todos.textContent = 'Todos';
    todos.addEventListener('click', () => cargarProductos(null));
    container.appendChild(todos);

    categorias.forEach(cat => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = `filtro-btn ${categoriaActual === cat.id ? 'activo' : ''}`;
      boton.dataset.categoria = String(cat.id);
      boton.textContent = cat.nombre;
      boton.addEventListener('click', () => cargarProductos(cat.id));
      container.appendChild(boton);
    });
  } catch (error) {
    console.error('Error al cargar categorías:', error);
    mostrarMensaje('No se pudieron cargar las categorías', 'error');
  }
}

async function cargarProductos(categoriaId = null) {
  categoriaActual = categoriaId;
  document.querySelectorAll('.filtro-btn').forEach(boton => {
    boton.classList.toggle(
      'activo',
      categoriaId === null ? boton.dataset.categoria === '' : boton.dataset.categoria === String(categoriaId)
    );
  });
  let url = '/productos';
  if (categoriaId) url += '?categoria=' + categoriaId;

  try {
    const res = await fetch(url);
    if (!res.ok) return mostrarMensaje(await res.text(), 'error');
    
    const productos = await res.json();
    ultimaLista = productos;
    pintarProductos(productos);
  } catch (error) {
    mostrarMensaje('Error al obtener los productos', 'error');
  }
}

function pintarProductos(productos) {
  const grid = document.getElementById('productos-grid');
  grid.replaceChildren();

  if (productos.length === 0) {
    const vacio = document.createElement('p');
    vacio.style.gridColumn = '1 / -1';
    vacio.style.textAlign = 'center';
    vacio.style.color = 'var(--color-texto-secundario)';
    vacio.textContent = 'No hay productos disponibles.';
    grid.appendChild(vacio);
    return;
  }

  productos.forEach(producto => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'producto-card';

    const imagen = document.createElement('img');
    const imagenFallback = 'https://via.placeholder.com/250x180?text=Sin+Imagen';
    let imagenSrc = imagenFallback;
    if (producto.imagen_url) {
      try {
        const imagenUrl = new URL(producto.imagen_url, window.location.origin);
        if (['http:', 'https:'].includes(imagenUrl.protocol)) imagenSrc = imagenUrl.href;
      } catch (error) {
        console.warn('URL de imagen inválida para el producto:', producto.id);
      }
    }
    imagen.src = imagenSrc;
    imagen.addEventListener('error', () => {
      imagen.src = imagenFallback;
    }, { once: true });
    imagen.alt = producto.nombre;
    imagen.loading = 'lazy';

    const descripcion = document.createElement('div');
    const categoria = document.createElement('span');
    categoria.className = 'categoria-tag';
    categoria.textContent = producto.categorias?.nombre || '';
    const nombre = document.createElement('h3');
    nombre.textContent = producto.nombre;
    const texto = document.createElement('p');
    texto.textContent = producto.descripcion || '';
    descripcion.append(categoria, nombre, texto);

    const compra = document.createElement('div');
    const precioStock = document.createElement('div');
    precioStock.className = 'precio-stock';
    const precio = document.createElement('span');
    precio.className = 'precio';
    precio.textContent = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(Number(producto.precio));
    const stock = document.createElement('span');
    stock.className = Number(producto.stock) > 0 ? 'stock-ok' : 'stock-bajo';
    stock.textContent = Number(producto.stock) > 0
      ? `Quedan ${producto.stock}`
      : 'Sin stock';
    precioStock.append(precio, stock);

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = Number(producto.stock) > 0 ? 'Agregar al carrito' : 'Sin stock';
    boton.disabled = Number(producto.stock) <= 0;
    boton.addEventListener('click', () => {
      agregarAlCarrito(producto.id, producto.nombre, Number(producto.precio));
    });

    compra.append(precioStock, boton);
    tarjeta.append(imagen, descripcion, compra);
    grid.appendChild(tarjeta);
  });
}

function buscar(texto) {
  const t = texto.toLowerCase();
  const filtrados = ultimaLista.filter(p => p.nombre.toLowerCase().includes(t));
  pintarProductos(filtrados);
}

// ==========================================
// 2. CARRITO DE COMPRAS
// ==========================================
function agregarAlCarrito(id, nombre, precio) {
  const item = carrito.find(i => i.producto_id === id);
  if (item) {
    item.cantidad++;
  } else {
    carrito.push({ producto_id: id, nombre, precio, cantidad: 1 });
  }
  guardarCarrito();
  mostrarMensaje('Producto agregado al carrito', 'ok');
}

function guardarCarrito() {
  try {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  } catch (error) {
    console.error('No se pudo guardar el carrito:', error);
    mostrarMensaje('No se pudo guardar el carrito en este navegador', 'error');
  }
  actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  document.getElementById('cart-count').innerText = totalItems;
}

function toggleCarrito() {
  const modal = document.getElementById('modal-carrito');
  const visible = modal.style.display === 'flex';
  if (!visible) pintarCarritoModal();
  modal.style.display = visible ? 'none' : 'flex';
}

function pintarCarritoModal() {
  const container = document.getElementById('carrito-items');
  container.replaceChildren();

  if (carrito.length === 0) {
    const vacio = document.createElement('p');
    vacio.style.textAlign = 'center';
    vacio.style.color = 'var(--color-texto-secundario)';
    vacio.textContent = 'Tu carrito está vacío.';
    container.appendChild(vacio);
    document.getElementById('carrito-total').innerText = '$0';
    return;
  }

  let total = 0;
  carrito.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    const fila = document.createElement('div');
    fila.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;border-bottom:1px solid var(--color-borde);padding-bottom:0.5rem;';

    const detalle = document.createElement('div');
    const nombre = document.createElement('strong');
    nombre.textContent = item.nombre;
    const precio = document.createElement('small');
    precio.textContent = `${formatearPrecio(item.precio)} x ${item.cantidad}`;
    detalle.append(nombre, document.createElement('br'), precio);

    const controles = document.createElement('div');
    const sumar = document.createElement('button');
    sumar.type = 'button';
    sumar.textContent = '+';
    sumar.style.cssText = 'width:30px;padding:4px;';
    sumar.addEventListener('click', () => cambiarCantidad(index, 1));

    const cantidad = document.createElement('span');
    cantidad.style.margin = '0 8px';
    cantidad.textContent = String(item.cantidad);

    const restar = document.createElement('button');
    restar.type = 'button';
    restar.textContent = '-';
    restar.style.cssText = 'width:30px;padding:4px;background:#6b7280;';
    restar.addEventListener('click', () => cambiarCantidad(index, -1));

    controles.append(sumar, cantidad, restar);
    fila.append(detalle, controles);
    container.appendChild(fila);
  });

  document.getElementById('carrito-total').innerText = formatearPrecio(total);
}

function formatearPrecio(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(Number(valor) || 0);
}

function cambiarCantidad(index, delta) {
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad <= 0) {
    carrito.splice(index, 1);
  }
  guardarCarrito();
  pintarCarritoModal();
}

// ==========================================
// 3. AUTENTICACIÓN Y COMPRA
// ==========================================
function abrirModalLogin() {
  document.getElementById('modal-auth').style.display = 'flex';
}

function cerrarModal() {
  const authModal = document.getElementById('modal-auth');
  const cartModal = document.getElementById('modal-carrito');

  if (authModal) authModal.style.display = 'none';
  if (cartModal) cartModal.style.display = 'none';
}

function cambiarModoAuth(registro) {
  document.getElementById('form-login').style.display = registro ? 'none' : 'block';
  document.getElementById('form-registro').style.display = registro ? 'block' : 'none';
  document.getElementById('modal-titulo').innerText = registro ? 'Crear Cuenta' : 'Iniciar Sesión';
}

async function registrar(evento) {
  evento.preventDefault();
  const nombre = document.getElementById('reg-nombre').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password })
    });

    if (res.status === 201) {
      mostrarMensaje('Cuenta creada. Si Supabase te pide confirmar el email, revisá tu correo y luego ingresá.', 'ok');
      cambiarModoAuth(false);
      document.getElementById('login-email').value = email;
    } else {
      mostrarMensaje(await res.text(), 'error');
    }
  } catch (error) {
    mostrarMensaje('Error de conexión al registrar', 'error');
  }
}

async function iniciarSesion(evento) {
  evento.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) return mostrarMensaje(await res.text(), 'error');

    const datos = await res.json();
    token = datos.token;
    usuarioEmail = email;

    localStorage.setItem('token', token);
    localStorage.setItem('email', email);

    cerrarModal();
    actualizarSesion();
    mostrarMensaje('¡Hola! Ya podés comprar.', 'ok');
  } catch (error) {
    mostrarMensaje('Error al iniciar sesión', 'error');
  }
}

function cerrarSesion() {
  token = null;
  usuarioEmail = null;
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  actualizarSesion();
  mostrarMensaje('Sesión cerrada', 'ok');
}

function actualizarSesion() {
  const info = document.getElementById('usuario-info');
  const btnLogin = document.getElementById('btn-login');

  if (token && usuarioEmail) {
    info.replaceChildren();
    info.append(document.createTextNode(`${usuarioEmail} | `));
    const salir = document.createElement('a');
    salir.href = '#';
    salir.textContent = 'Salir';
    salir.style.cssText = 'color:var(--color-peligro);text-decoration:none;';
    salir.addEventListener('click', evento => {
      evento.preventDefault();
      cerrarSesion();
    });
    info.appendChild(salir);
    btnLogin.style.display = 'none';
  } else {
    info.replaceChildren();
    btnLogin.style.display = 'inline-block';
  }
}

async function comprar() {
  if (carrito.length === 0) {
    return mostrarMensaje('El carrito está vacío', 'error');
  }

  if (!token) {
    cerrarModal();
    abrirModalLogin();
    return mostrarMensaje('Ingresá para poder comprar', 'error');
  }

  try {
    const res = await fetch('/pedidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ items: carrito })
    });

    if (res.status === 201) {
      const pedido = await res.json();
      carrito = [];
      guardarCarrito();
      cerrarModal();
      mostrarMensaje(`¡Compra realizada! Pedido #${pedido.id} por $${pedido.total}`, 'ok');
      cargarProductos(categoriaActual);
    } else if (res.status === 401) {
      cerrarSesion();
      abrirModalLogin();
      mostrarMensaje('Tu sesión venció. Ingresá de nuevo.', 'error');
    } else {
      mostrarMensaje(await res.text(), 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al procesar la compra', 'error');
  }
}

// ==========================================
// 4. MENSAJES FLOTANTES
// ==========================================
function mostrarMensaje(texto, tipo) {
  const msg = document.getElementById('mensaje-flotante');
  msg.innerText = texto;
  msg.className = `mensaje-flotante mensaje-${tipo}`;
  msg.style.display = 'block';

  setTimeout(() => {
    msg.style.display = 'none';
  }, 4000);
}