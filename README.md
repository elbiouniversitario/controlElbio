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

La app guarda los datos en [Supabase](https://supabase.com). Si las variables de entorno no están cargadas, arranca en **modo demo** con los datos de ejemplo de `src/data/initialData.ts` y muestra un aviso amarillo arriba: en ese modo los cambios se pierden al recargar. Si las variables están pero la base no responde (por ejemplo, sin internet), muestra "No se pudieron cargar los datos" con un botón para reintentar.

Archivos:

- `supabase/migrations/20260929000000_esquema_inicial.sql`: tablas, índices, funciones y permisos (RLS)
- `supabase/seed.sql`: los datos de ejemplo (9 jugadores, reglas, mensajes y roles)
- `supabase/migrations/20260930000000_login_y_roles.sql`: login, roles y permisos por rol; columnas del padrón LUD
- `src/lib/supabase.ts`: cliente; `src/lib/db.ts`: lecturas y escrituras

### Puesta en marcha (una sola vez)

1. **Crear el proyecto.** En [supabase.com/dashboard](https://supabase.com/dashboard) → *New project*, con la cuenta del club. Región: **South America (São Paulo) – `sa-east-1`**. Guardar la contraseña de la base en un lugar seguro.
2. **Crear las tablas.** En el proyecto: *SQL Editor* → *New query*, pegar **todo** el contenido de `supabase/migrations/20260929000000_esquema_inicial.sql` y apretar *Run*. Tiene que mostrar una fila que dice **"Listo: tablas creadas"**.
   - Si aparece `syntax error at end of input`: asegurate de no tener texto seleccionado en el editor (si hay algo seleccionado, Supabase corre solo eso), borrá todo, pegá de nuevo el archivo completo y volvé a apretar *Run*.
   - Si aparece `already exists`: la migración ya se había corrido; seguí con el paso 3.
   - Para copiar el archivo desde GitHub: abrilo y usá el botón *Copy raw file* (ícono de copiar, arriba a la derecha).
3. **Cargar los datos de ejemplo** (opcional, recomendado para probar). Nueva query con el contenido de `supabase/seed.sql` → *Run* (muestra "Listo: datos de ejemplo cargados"). Se puede correr más de una vez sin duplicar nada. En el encabezado del archivo están los `delete` para borrarlos antes de cargar jugadores reales.
4. **Copiar las credenciales.** En *Project Settings* → *API* (o el botón *Connect*):
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key** (la que empieza con `eyJ...` o con `sb_publishable_...`; cualquiera de las dos sirve).
   - ⚠️ **Nunca** usar la `service_role` / `secret` key en la app: esa saltea todos los permisos.
5. **Cargarlas en Vercel.** En el proyecto de Vercel → *Settings* → *Environment Variables*, agregar para *Production* y *Preview*:
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la anon / publishable key
6. **Redeployar.** *Deployments* → en el último deploy, menú `⋯` → *Redeploy*. Las variables `VITE_` se leen al compilar, así que sin redeploy no toman efecto. Al abrir la app ya no tiene que aparecer el aviso de "Modo demo".

### Textos editables

En **Club Admin → Textos de la app** se editan los datos que cambian cada semana o cada temporada: rival, fecha del torneo, día y hora del partido, citación, cancha, temporada, divisional, etc. Se guardan en la tabla `textos_app`. Si una clave no está guardada se usa el valor por defecto de `src/lib/textos.tsx`, que es también donde se agregan claves nuevas.

### En local

```bash
cp .env.example .env.local   # completar las dos variables
npm run dev
```

### Tareas de mantenimiento

- **Cuotas del mes nuevo:** a principio de mes, en el SQL Editor: `select public.generar_cuotas_mes();` (crea la cuota de $1.400 del mes para cada jugador que no la tenga). Otro monto: `select public.generar_cuotas_mes(current_date, 1500);`
- **Cuotas vencidas:** pasar a vencidas las impagas de meses anteriores: `update public.cuotas set estado = 'vencida' where estado = 'pendiente' and periodo < date_trunc('month', current_date);`

### Login y permisos por rol

Con Supabase configurado, la app pide **email y contraseña**. No se usa "magic link" porque en el iPhone la app instalada no comparte la sesión con Safari.

| Rol | Quién | Qué ve y qué puede hacer |
| --- | --- | --- |
| `admin` | directiva | todo: textos de la app, reglas, accesos del staff |
| `dt` | cuerpo técnico / delegados | alertas, planilla, alta de jugadores; ve quién está al día (no ve pagos) |
| `tesorero` | tesorería | cuotas y cobros, alertas |
| jugador | cada jugador | solo su ficha, sus cuotas; confirma asistencia |

- **Staff:** el admin los habilita en **Club Admin → Dar acceso al staff** con su email. Después cada uno toca "Crear cuenta" en la app **con ese mismo email**.
- **Jugadores:** no hace falta habilitarlos. Si crean su cuenta con el email cargado en su ficha, entran y ven solo lo suyo.
- Cualquier otra cuenta queda "pendiente de habilitación" y no ve nada.
- Sin sesión, la anon key no puede leer ni escribir nada. Nadie puede borrar jugadores desde la app.

**Activarlo (una sola vez):**
1. SQL Editor → pegar y correr `supabase/migrations/20260930000000_login_y_roles.sql` (dice "Listo: login y permisos por rol activados"). Desde ese momento la versión vieja de la app (sin login) deja de ver datos, así que conviene hacer los pasos 1 a 4 seguidos.
2. Habilitar al primer admin: `insert into public.miembros_club (email, rol) values ('tu-email@ejemplo.com', 'admin');`
3. Supabase → *Authentication* → *URL Configuration*: en **Site URL** poner la URL de producción de Vercel (la usan los links de confirmación y de "Olvidé mi contraseña").
4. Deployar la versión con login (mergear el PR).
5. Abrir la app → "Crear cuenta" con el email del paso 2 → confirmar el email → ingresar.

El servicio de email que trae Supabase de fábrica manda pocos mails por hora (confirmaciones y recuperación de contraseña). Si se registra mucha gente el mismo día y algún mail no llega, esperar un rato o configurar un SMTP propio en *Authentication → Emails*.

### Cargar el padrón de jugadores

El padrón de la liga (Excel con carné, cédula, nombre, nacimiento y vencimientos) se carga con un SQL generado a partir del Excel. **Ese SQL no se sube al repo** porque tiene datos personales y el repo es público. Identifica a cada jugador por cédula, así que se puede volver a correr con un padrón actualizado sin duplicar a nadie. Los jugadores marcados como inactivos no aparecen en la app. El carné LUD vencido inhabilita al jugador en la planilla, igual que la ficha médica vencida.

## Instalar en el celular (PWA)

La app se puede instalar como una aplicación más: queda con su ícono en la pantalla de inicio y abre a pantalla completa, sin la barra del navegador.

- **iPhone:** abrir la URL de Vercel en **Safari** → botón *Compartir* (cuadrado con flecha) → **Agregar a inicio** → *Agregar*.
- **Android:** abrir en Chrome → menú `⋮` → **Instalar app** (o *Agregar a pantalla principal*).
- **Computadora (Chrome/Edge):** ícono de instalar en la barra de direcciones.

Las actualizaciones llegan solas: cuando se hace un deploy nuevo, la app instalada lo toma la próxima vez que se abre con internet. Sin conexión, la app abre igual y muestra un aviso para reintentar la carga de datos.

Archivos: `public/manifest.webmanifest` (nombre, colores e íconos), `public/sw.js` (service worker: funcionamiento sin conexión), `public/icons/` y `public/apple-touch-icon.png` (ícono "EF"; para usar el escudo real, reemplazar esos PNG por versiones del escudo de 192, 512 y 180 px).

## Próximos pasos

- Pantalla para editar jugadores (email, teléfono, número, posición): hoy el padrón no los trae
- Fotos de jugadores y escaneos de carné en Supabase Storage (hoy se muestran las iniciales)
- Escudo del club: hoy apunta a una URL temporal de AI Studio; conviene subirlo a `public/`
- Envío real por WhatsApp (hoy los avisos solo quedan registrados en el historial)
