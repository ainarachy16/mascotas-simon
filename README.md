# PetCare Market

Tienda de ejemplo con Express, Supabase Auth, Postgres y un frontend JavaScript.

## Requisitos

- Node.js 18 o posterior
- Un proyecto Supabase

## Preparar Supabase

Para adaptar la base existente del proyecto, abrí **SQL Editor** en Supabase y
ejecutá una sola vez [`db/migracion_supabase.sql`](db/migracion_supabase.sql).
La migración es repetible, agrega las columnas y relaciones que usa la tienda,
habilita políticas RLS, configura el perfil al registrarse y crea la función
transaccional de compra. No elimina datos; agrega productos de demostración solo
si las tablas de categorías y productos están vacías.

Para una base nueva, ejecutá primero [`db/esquema.sql`](db/esquema.sql) y después
la migración. El esquema base incluye productos de ejemplo.

La tienda usa estas tablas:

- `categorias` (`id`, `nombres`)
- `productos` (`id`, `nombre`, `descripcion`, `precio`, `stock`, `imagen_url`,
  `categoria_id`, `activo`)
- `perfiles` (vinculada al usuario de Supabase Auth)
- `pedidos` (usuario, total y estado)
- `pedido_items` (productos y cantidades del pedido)

La aplicación puede usar una clave publishable (`sb_publishable_...`) o la anon
key heredada. No necesita una service role key para el flujo normal: el acceso
está protegido con RLS y las compras se validan en una función SQL del servidor.
Nunca pegues una clave secreta en el frontend ni la subas a Git.

### Imágenes

Las imágenes son opcionales. Para usarlas, crea un bucket público llamado
`productos` en Storage, sube los archivos y guarda sus URLs públicas en
`productos.imagen_url`.

## Ejecutar localmente

En PowerShell, desde la carpeta del proyecto:

```powershell
Copy-Item .env.example .env
```

Completa `SUPABASE_URL` y `SUPABASE_KEY` en `.env`; después:

```powershell
npm install
npm start
```

Abre <http://localhost:3000>. El archivo `.env` está excluido de Git.

## API

| Método | Ruta | Uso |
|---|---|---|
| POST | `/registro` | Crear cuenta con `nombre`, `email` y `password` |
| POST | `/login` | Obtener un access token |
| GET | `/categorias` | Listar categorías |
| GET | `/productos` | Listar productos; admite `?categoria=ID` |
| POST | `/pedidos` | Crear compra autenticada con `{ "items": [{ "producto_id": 1, "cantidad": 2 }] }` |

El backend calcula el total desde los precios reales y bloquea/actualiza stock en
una única transacción. No confía en precios ni totales enviados por el navegador.

## Deploy en Vercel

Importa el repositorio y configura las variables `SUPABASE_URL` y `SUPABASE_KEY`
en el entorno del proyecto. Ejecuta la migración SQL antes del deploy. No agregues
el archivo `.env` al repositorio.

## Trabajo práctico

- [ ] Personalizar nombre, imágenes y productos
- [ ] Probar registro, inicio de sesión y compra
- [ ] Publicar el deploy y agregar su enlace e integrantes

Integrantes: _completar_ · Link del deploy: _completar_

Prof. Julia Panei · UTN Neuquén · Diseño Backend 2026
