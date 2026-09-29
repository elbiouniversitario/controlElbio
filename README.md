# Club Elbio Fernández — Gestión LUD

Sistema de gestión deportiva del Club Elbio Fernández para la Liga Universitaria de Deportes: fichas médicas, tesorería y cuotas, planilla de partido y convocatorias.

Stack: React 19 + TypeScript + Vite + Tailwind CSS 4.

## Correr en local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev      # http://localhost:3000
```

Otros comandos:

- `npm run build` genera la versión de producción en `dist/`
- `npm run lint` corre el chequeo de tipos de TypeScript

## Pantallas

- **Alertas y vencimientos**: carnés de salud por vencer, reglas de aviso automático y envíos por WhatsApp
- **Tesorería y cuotas**: estado de pago por jugador, registro de cobros y recordatorios
- **Planilla (DT)**: titulares, suplentes, bajas y PDF de planilla
- **Mi ficha**: perfil del jugador y confirmación de asistencia
- **Club admin**: roles y configuración general
- **Nuevo jugador**: alta de jugador paso a paso

## Base de datos (Supabase)

La app guarda los datos en [Supabase](https://supabase.com). Si las variables de entorno no están cargadas (o la base no responde), arranca en **modo demo** con los datos de ejemplo de `src/data/initialData.ts` y muestra un aviso amarillo arriba: en ese modo los cambios se pierden al recargar.

Archivos:

- `supabase/migrations/20260929000000_esquema_inicial.sql`: tablas, índices, funciones y permisos (RLS)
- `supabase/seed.sql`: los datos de ejemplo (9 jugadores, reglas, mensajes y roles)
- `src/lib/supabase.ts`: cliente; `src/lib/db.ts`: lecturas y escrituras

### Puesta en marcha (una sola vez)

1. **Crear el proyecto.** En [supabase.com/dashboard](https://supabase.com/dashboard) → *New project*, con la cuenta del club. Región: **South America (São Paulo) – `sa-east-1`**. Guardar la contraseña de la base en un lugar seguro.
2. **Crear las tablas.** En el proyecto: *SQL Editor* → *New query*, pegar **todo** el contenido de `supabase/migrations/20260929000000_esquema_inicial.sql` y apretar *Run*. Tiene que terminar con "Success. No rows returned".
3. **Cargar los datos de ejemplo** (opcional, recomendado para probar). Nueva query con el contenido de `supabase/seed.sql` → *Run*. Se puede correr más de una vez sin duplicar nada. En el encabezado del archivo están los `delete` para borrarlos antes de cargar jugadores reales.
4. **Copiar las credenciales.** En *Project Settings* → *API* (o el botón *Connect*):
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key** (la que empieza con `eyJ...` o con `sb_publishable_...`; cualquiera de las dos sirve).
   - ⚠️ **Nunca** usar la `service_role` / `secret` key en la app: esa saltea todos los permisos.
5. **Cargarlas en Vercel.** En el proyecto de Vercel → *Settings* → *Environment Variables*, agregar para *Production* y *Preview*:
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la anon / publishable key
6. **Redeployar.** *Deployments* → en el último deploy, menú `⋯` → *Redeploy*. Las variables `VITE_` se leen al compilar, así que sin redeploy no toman efecto. Al abrir la app ya no tiene que aparecer el aviso de "Modo demo".

### En local

```bash
cp .env.example .env.local   # completar las dos variables
npm run dev
```

### Tareas de mantenimiento

- **Cuotas del mes nuevo:** a principio de mes, en el SQL Editor: `select public.generar_cuotas_mes();` (crea la cuota de $1.400 del mes para cada jugador que no la tenga). Otro monto: `select public.generar_cuotas_mes(current_date, 1500);`
- **Cuotas vencidas:** pasar a vencidas las impagas de meses anteriores: `update public.cuotas set estado = 'vencida' where estado = 'pendiente' and periodo < date_trunc('month', current_date);`

### Seguridad: pendiente para cuando haya login

Por ahora la app **no tiene login**: cualquiera con el link puede leer y modificar los datos (la anon key viaja en el JavaScript de la página). Eso incluye teléfonos, direcciones y datos de salud de los jugadores, así que **no conviene cargar datos reales hasta agregar el login**. La migración ya deja escrito (comentado al final) cómo endurecer los permisos por rol: DT/delegados, tesorero y jugadores viendo solo lo suyo. Desde la app no se puede borrar nada.

## Próximos pasos

- Login con Supabase Auth y permisos por rol (ver final de la migración)
- Fotos de jugadores y escaneos de carné en Supabase Storage (hoy se muestran las iniciales)
- Escudo del club: hoy apunta a una URL temporal de AI Studio; conviene subirlo a `public/`
- Envío real por WhatsApp (hoy los avisos solo quedan registrados en el historial)
