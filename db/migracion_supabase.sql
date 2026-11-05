-- Adaptacion aditiva del esquema existente de la tienda.
-- Es segura para volver a ejecutar: no elimina tablas ni registros.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categorias'
      AND column_name = 'nombre'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categorias'
      AND column_name = 'nombres'
  ) THEN
    ALTER TABLE public.categorias RENAME COLUMN nombre TO nombres;
  END IF;
END
$$;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS imagen_url text,
  ADD COLUMN IF NOT EXISTS categoria_id integer,
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

UPDATE public.productos SET activo = true WHERE activo IS NULL;

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS usuario_id uuid,
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.pedido_items (
  id serial PRIMARY KEY,
  pedido_id integer,
  producto_id integer,
  cantidad integer NOT NULL,
  precio_unitario numeric(10, 2) NOT NULL
);

ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS pedido_id integer,
  ADD COLUMN IF NOT EXISTS producto_id integer;

ALTER TABLE public.pedidos
  ALTER COLUMN estado SET DEFAULT 'pendiente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'productos_categoria_id_fkey'
      AND conrelid = 'public.productos'::regclass
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_categoria_id_fkey
      FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pedidos_usuario_id_fkey'
      AND conrelid = 'public.pedidos'::regclass
  ) THEN
    ALTER TABLE public.pedidos
      ADD CONSTRAINT pedidos_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pedido_items_pedido_id_fkey'
      AND conrelid = 'public.pedido_items'::regclass
  ) THEN
    ALTER TABLE public.pedido_items
      ADD CONSTRAINT pedido_items_pedido_id_fkey
      FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pedido_items_producto_id_fkey'
      AND conrelid = 'public.pedido_items'::regclass
  ) THEN
    ALTER TABLE public.pedido_items
      ADD CONSTRAINT pedido_items_producto_id_fkey
      FOREIGN KEY (producto_id) REFERENCES public.productos(id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categorias)
     AND NOT EXISTS (SELECT 1 FROM public.productos) THEN
    INSERT INTO public.categorias (nombres) VALUES
      ('Alimentos Perros'),
      ('Alimentos Gatos'),
      ('Accesorios y Juguetes'),
      ('Higiene y Salud');

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
    JOIN public.categorias c ON c.nombres = seed.categoria;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'nombre', ''), split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crear_perfil_al_registrar ON auth.users;
CREATE TRIGGER crear_perfil_al_registrar
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();

REVOKE ALL ON FUNCTION public.crear_perfil_usuario() FROM PUBLIC, anon, authenticated;

INSERT INTO public.perfiles (id, nombre, email)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'nombre', ''), NULLIF(split_part(u.email, '@', 1), ''), 'cliente'),
  u.email
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.crear_pedido(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
  v_pedido_id integer;
  v_total numeric(12, 2) := 0;
  v_item record;
  v_producto public.productos%ROWTYPE;
BEGIN
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para comprar';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'El carrito no es válido';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito está vacío';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS entries(item)
    WHERE jsonb_typeof(entries.item) <> 'object'
       OR NOT (entries.item ? 'producto_id')
       OR NOT (entries.item ? 'cantidad')
  ) THEN
    RAISE EXCEPTION 'El carrito contiene un item inválido';
  END IF;

  FOR v_item IN
    SELECT producto_id, SUM(cantidad::bigint) AS cantidad
    FROM jsonb_to_recordset(p_items) AS item(producto_id integer, cantidad integer)
    GROUP BY producto_id
    ORDER BY producto_id
  LOOP
    IF v_item.producto_id IS NULL OR v_item.producto_id < 1
       OR v_item.cantidad IS NULL OR v_item.cantidad < 1
       OR v_item.cantidad > 2147483647 THEN
      RAISE EXCEPTION 'El producto o la cantidad no son válidos';
    END IF;

    SELECT * INTO v_producto
    FROM public.productos
    WHERE id = v_item.producto_id
    FOR UPDATE;

    IF NOT FOUND OR NOT COALESCE(v_producto.activo, false) THEN
      RAISE EXCEPTION 'El producto solicitado no está disponible';
    END IF;

    IF v_producto.precio IS NULL OR v_producto.precio < 0 THEN
      RAISE EXCEPTION 'El precio del producto no es válido';
    END IF;

    IF v_producto.stock IS NULL OR v_producto.stock < v_item.cantidad THEN
      RAISE EXCEPTION 'No hay stock suficiente de %', v_producto.nombre;
    END IF;

    v_total := v_total + (v_producto.precio * v_item.cantidad);
  END LOOP;

  INSERT INTO public.pedidos (usuario_id, total)
  VALUES (v_usuario_id, v_total)
  RETURNING id INTO v_pedido_id;

  FOR v_item IN
    SELECT producto_id, SUM(cantidad::bigint) AS cantidad
    FROM jsonb_to_recordset(p_items) AS item(producto_id integer, cantidad integer)
    GROUP BY producto_id
    ORDER BY producto_id
  LOOP
    SELECT * INTO v_producto
    FROM public.productos
    WHERE id = v_item.producto_id
    FOR UPDATE;

    UPDATE public.productos
    SET stock = stock - v_item.cantidad::integer
    WHERE id = v_item.producto_id;

    INSERT INTO public.pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    VALUES (v_pedido_id, v_item.producto_id, v_item.cantidad, v_producto.precio);
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_pedido_id,
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.crear_pedido(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_pedido(jsonb) TO authenticated;

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.categorias, public.productos TO anon, authenticated;
GRANT SELECT ON public.perfiles, public.pedidos, public.pedido_items TO authenticated;

DROP POLICY IF EXISTS categorias_lectura_publica ON public.categorias;
CREATE POLICY categorias_lectura_publica
  ON public.categorias FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS productos_activos_lectura_publica ON public.productos;
CREATE POLICY productos_activos_lectura_publica
  ON public.productos FOR SELECT TO anon, authenticated USING (activo = true);

DROP POLICY IF EXISTS perfiles_lectura_propios ON public.perfiles;
CREATE POLICY perfiles_lectura_propios
  ON public.perfiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS pedidos_lectura_propios ON public.pedidos;
CREATE POLICY pedidos_lectura_propios
  ON public.pedidos FOR SELECT TO authenticated USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS pedido_items_lectura_propios ON public.pedido_items;
CREATE POLICY pedido_items_lectura_propios
  ON public.pedido_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_items.pedido_id
        AND p.usuario_id = auth.uid()
    )
  );
