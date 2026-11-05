-- Esquema base para una base nueva. En una base existente, usar
-- migracion_supabase.sql para agregar los cambios sin borrar sus datos.

CREATE TABLE IF NOT EXISTS public.categorias (
  id serial PRIMARY KEY,
  nombres text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.productos (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  precio numeric(10, 2) NOT NULL CHECK (precio >= 0),
  stock integer NOT NULL CHECK (stock >= 0),
  imagen_url text,
  categoria_id integer REFERENCES public.categorias(id),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  email text,
  rol text NOT NULL DEFAULT 'cliente'
);

CREATE TABLE IF NOT EXISTS public.pedidos (
  id serial PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  total numeric(12, 2) NOT NULL CHECK (total >= 0),
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedido_items (
  id serial PRIMARY KEY,
  pedido_id integer NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  producto_id integer NOT NULL REFERENCES public.productos(id),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric(10, 2) NOT NULL CHECK (precio_unitario >= 0)
);

INSERT INTO public.categorias (nombres)
SELECT seed.nombres
FROM (VALUES
  ('Alimentos Perros'),
  ('Alimentos Gatos'),
  ('Accesorios y Juguetes'),
  ('Higiene y Salud')
) AS seed(nombres)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias c WHERE c.nombres = seed.nombres
);

INSERT INTO public.productos (nombre, descripcion, precio, stock, categoria_id)
SELECT seed.nombre, seed.descripcion, seed.precio, seed.stock, c.id
FROM (VALUES
  ('Royal Canin Medium Adult 15kg', 'Alimento seco equilibrado para perros medianos adultos.', 48500.00, 8, 'Alimentos Perros'),
  ('Royal Canin Mini Adult 3kg', 'Nutrición adaptada para perros de raza pequeña.', 19200.00, 15, 'Alimentos Perros'),
  ('Royal Canin Sterilised Gato 7.5kg', 'Alimento balanceado para gatos esterilizados.', 42000.00, 2, 'Alimentos Gatos'),
  ('Royal Canin Kitten 2kg', 'Alimento super premium para gatitos en crecimiento.', 15500.00, 20, 'Alimentos Gatos'),
  ('Pouch Royal Canin Perro Adulto 85g', 'Alimento húmedo en sobre con bocado en salsa.', 1950.00, 50, 'Alimentos Perros'),
  ('Collar Ajustable Reflectivo', 'Collar de alta resistencia con costura reflectante.', 6800.00, 18, 'Accesorios y Juguetes'),
  ('Juguete Mordillo Hueso de Goma', 'Juguete interactivo anti-estrés para mordedura firme.', 4500.00, 30, 'Accesorios y Juguetes'),
  ('Shampoo Antipulgas y Garrapatas 250ml', 'Fórmula de cuidado dermatológico y protección parasitaria.', 10200.00, 12, 'Higiene y Salud')
) AS seed(nombre, descripcion, precio, stock, categoria)
JOIN public.categorias c ON c.nombres = seed.categoria
WHERE NOT EXISTS (
  SELECT 1 FROM public.productos p WHERE p.nombre = seed.nombre
);
