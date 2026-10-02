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
- `supabase/migrations/20260930010000_vincular_jugador.sql`: ingreso de jugadores con celular + cédula
- `supabase/migrations/20260930020000_habilitacion_y_documentos.sql`: habilitación manual y foto del carné LUD
- `supabase/migrations/20260930030000_cuotas_desde_la_app.sql`: generar las cuotas del mes desde Tesorería; perfil "Tesorería"
- `supabase/migrations/20261001000000_partido_editable_por_dt.sql`: el cuerpo técnico (DT) puede cargar el próximo partido desde Planilla
- `supabase/migrations/20261002000000_notificaciones_push.sql`: notificaciones de la app (suscripciones de cada celular y funciones para mandarlas)
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

- **Cuotas del mes nuevo:** en **Tesorería**, la flechita de "Concepto actual" → **Generar cuotas del mes** (admin y tesorería). Crea la cuota de cada jugador activo con el valor de *Textos de la app → Tesorería* y pasa a vencidas las impagas de meses anteriores. Se puede tocar más de una vez sin duplicar.

### Login y permisos por rol

Con Supabase configurado, la app pide **email y contraseña**. No se usa "magic link" porque en el iPhone la app instalada no comparte la sesión con Safari.

| Rol | Quién | Qué ve y qué puede hacer |
| --- | --- | --- |
| `admin` | directiva | todo: textos de la app, reglas, accesos del staff |
| `dt` | cuerpo técnico / delegados | alertas, planilla, alta de jugadores; ve quién está al día (no ve pagos) |
| `tesorero` | tesorería | cuotas y cobros, alertas |
| jugador | cada jugador | solo su ficha, sus cuotas; confirma asistencia |

- **Staff que también juega:** en **Club Admin → Tu perfil de jugador** (o el menú de la cuenta) se pasa a **ver la app como jugador**: solo su ficha, como la ve cualquier jugador, con una franja para *Volver al panel*. Si su email no está en ninguna ficha, ahí mismo se elige del plantel para asociarla.
- **Staff:** el admin los habilita en **Club Admin → Dar acceso al staff** con su email. Después cada uno toca "Crear cuenta" en la app **con ese mismo email**.
- **Jugadores:** entran con el botón **"Soy jugador"**, sin email ni contraseña. Escriben su celular, se eligen de la lista del plantel y confirman con su **cédula**, que tiene que coincidir con la del padrón. Desde ahí la app los reconoce en ese celular, les muestra solo su ficha y guarda su número en la ficha. Hay un máximo de 5 cédulas incorrectas por hora. Si cierran sesión o cambian de celular, repiten el paso. También pueden entrar con una cuenta de email si ese email está cargado en su ficha.
- Cualquier otra cuenta queda "pendiente de habilitación" y no ve nada.
- Sin sesión, la anon key no puede leer ni escribir nada. Nadie puede borrar jugadores desde la app.

**Activarlo (una sola vez):**
1. SQL Editor → pegar y correr `supabase/migrations/20260930000000_login_y_roles.sql` (dice "Listo: login y permisos por rol activados"). Desde ese momento la versión vieja de la app (sin login) deja de ver datos, así que conviene hacer los pasos 1 a 4 seguidos.
2. Habilitar al primer admin: `insert into public.miembros_club (email, rol) values ('tu-email@ejemplo.com', 'admin');`
3. Supabase → *Authentication* → *URL Configuration*: en **Site URL** poner la URL de producción de Vercel (la usan los links de confirmación y de "Olvidé mi contraseña").
4. Deployar la versión con login (mergear el PR).
5. Abrir la app → "Crear cuenta" con el email del paso 2 → confirmar el email → ingresar.

**Ingreso de jugadores con celular (una sola vez):**
1. SQL Editor → correr `supabase/migrations/20260930010000_vincular_jugador.sql` (dice "Listo: ingreso de jugadores con celular activado").
2. Supabase → *Authentication* → *Sign In / Providers* → activar **Allow anonymous sign-ins**.
3. Si muchos jugadores van a entrar a la vez desde el mismo WiFi (por ejemplo, en el club), subir el límite de *Anonymous sign-ins* en *Authentication → Rate Limits*: por defecto son 30 por hora por IP.

El servicio de email que trae Supabase de fábrica manda pocos mails por hora (confirmaciones y recuperación de contraseña). Si se registra mucha gente el mismo día y algún mail no llega, esperar un rato o configurar un SMTP propio en *Authentication → Emails*.

### Editar jugadores

En **Planilla**, el lápiz al lado del nombre de cada jugador abre su ficha para editar: nombre, número, posición, capitán, rol en el partido (titular, suplente, reserva, baja), carné LUD en mano, celular, email, dirección, contacto de emergencia y cobertura médica. Lo pueden hacer el DT y el admin.

### Habilitación, ficha médica y carné LUD

En **Planilla → Documentos** (DT y admin), para cada jugador:

- **Habilitación:** *Automática* (la app la calcula: ficha médica vigente y no estar de baja; el carné LUD vencido solo avisa), o forzada a **Habilitado** / **Inhabilitado** con un motivo (suspensión, trámite autorizado por la liga, etc.). Lo forzado manda sobre los vencimientos hasta que se vuelva a *Automática*.
- **Ficha médica:** cargar una nueva con fecha de examen, vencimiento y clínica (sin foto). Queda como vigente la de vencimiento más lejano.
- **Carné LUD:** número, vencimiento y foto.

La foto del carné LUD (imagen o PDF, hasta 10 MB) va al bucket **privado** `documentos` de Supabase Storage, en una carpeta por jugador. La ve el staff y cada jugador la suya (en Mi ficha → *Ver foto del carné*), mediante links que duran 1 hora. Los suben solo el DT y el admin. La migración crea el bucket; no hay que configurar nada más en Supabase.

### Cargar el padrón de jugadores

El padrón de la liga (Excel con carné, cédula, nombre, nacimiento y vencimientos) se carga con un SQL generado a partir del Excel. **Ese SQL no se sube al repo** porque tiene datos personales y el repo es público. Identifica a cada jugador por cédula, así que se puede volver a correr con un padrón actualizado sin duplicar a nadie. Los jugadores marcados como inactivos no aparecen en la app. La ficha médica vencida inhabilita al jugador; el carné LUD vencido no inhabilita, pero aparece como alerta (Alertas, notificaciones y planilla).

### Avisos por WhatsApp

La app no manda mensajes sola (eso requeriría la API paga de WhatsApp Business). Cada botón de aviso abre **el WhatsApp de quien lo toca** con el mensaje ya escrito:

- **Uno por uno:** la lista de destinatarios con un botón *Enviar* por jugador (personalizado con su nombre, vencimiento o deuda). Usa el celular cargado en la ficha; los que no tienen celular aparecen marcados.
- **Al grupo:** *Mandar al grupo* abre WhatsApp para elegir el chat o grupo del plantel.

Cada mensaje abierto queda en **Alertas → Historial**. Las plantillas se ven en **Alertas → Plantillas** y las edita el admin. Ahí o en *Textos de la app → Plantillas de WhatsApp* se pueden usar `{nombre}`, `{vencimiento}`, `{documento}`, `{deuda}`, `{fecha}`, `{rival}`, `{dia}`, `{hora}`, `{citacion}` y `{cancha}`.

En **Textos de la app** conviene completar: celular y nombre del **delegado** (botón "Escribir al delegado" de los jugadores), celular de **tesorería** ("Avisar que pagué"), **cómo pagar** (datos de la cuenta) y el **aviso del tablón**.

## Notificaciones de la app

Gratis y sin WhatsApp: cada jugador las activa una vez (Mi ficha → *Activar notificaciones*, o el aviso de arriba) y el staff manda avisos desde la misma ventana de envío que usa para WhatsApp (*Mandar notificación a N*). A quien no las activó se le sigue mandando por WhatsApp.

- En **iPhone** solo funcionan con la app agregada a la pantalla de inicio (iOS 16.4 o más nuevo). En Android, desde Chrome.
- **Cartel para el plantel** (Planilla → Operativa de partido): QR a la app con los pasos para instalarla y activar los avisos; se imprime o se manda al grupo de WhatsApp.
- El envío lo hace la función de Vercel `api/notificar.ts`. Usa el login de quien manda: la base solo le da las suscripciones al staff, así que **no** hace falta la clave de servicio de Supabase.

Configuración (una sola vez):

1. Correr la migración `20261002000000_notificaciones_push.sql` en el SQL Editor de Supabase.
2. Generar un par de claves VAPID (por ejemplo con `npx web-push generate-vapid-keys` o en un generador de claves VAPID web) y cargarlas en Vercel → Settings → Environment Variables, en Production y Preview:
   - `VITE_VAPID_PUBLIC_KEY` = la clave **pública** (tipo normal; la usa la app).
   - `VAPID_PRIVATE_KEY` = la clave **privada** (tipo **Secret**; nunca en el repo ni en el chat).
   Si se cambia el par de claves, todos tienen que volver a activar las notificaciones.
3. Opcional: `VAPID_SUBJECT` = `mailto:` + un email de contacto del club.
4. Redeploy.

## Instalar en el celular (PWA)

La app se puede instalar como una aplicación más: queda con su ícono en la pantalla de inicio y abre a pantalla completa, sin la barra del navegador.

- **iPhone:** abrir la URL de Vercel en **Safari** → botón *Compartir* (cuadrado con flecha) → **Agregar a inicio** → *Agregar*.
- **Android:** abrir en Chrome → menú `⋮` → **Instalar app** (o *Agregar a pantalla principal*).
- **Computadora (Chrome/Edge):** ícono de instalar en la barra de direcciones.

Las actualizaciones llegan solas: cuando se hace un deploy nuevo, la app instalada lo toma la próxima vez que se abre con internet. Sin conexión, la app abre igual y muestra un aviso para reintentar la carga de datos.

Archivos: `public/manifest.webmanifest` (nombre, colores e íconos), `public/sw.js` (service worker: funcionamiento sin conexión), `public/icons/` y `public/apple-touch-icon.png` (ícono "EF"; para usar el escudo real, reemplazar esos PNG por versiones del escudo de 192, 512 y 180 px).

## Próximos pasos

- Ver y quitar desde la app los celulares vinculados a cada jugador (hoy: tabla `vinculos_jugador`)
- Fotos de perfil de los jugadores (hoy se muestran las iniciales)
- Monto de la cuota al dar de alta: `alta_jugador` crea la cuota del mes con el monto por defecto de la tabla (1400), no con el de Textos → Tesorería

### Pendiente: cobros con dLocal Go

El club ya cobra la cuota con una suscripción de dLocal Go (**un solo plan mensual**). Los jugadores también pagan de otras maneras (efectivo, transferencia), así que el registro manual de Tesorería se mantiene.

Plan para conectarlo:

1. **Aviso de pago** — función de Vercel (`/api/dlocal-webhook`) que dLocal llama en cada cobro (`notification_url` del plan). No confía en el aviso: consulta el pago en la API de dLocal Go, busca al jugador por cédula o email del suscriptor y marca la cuota del mes como pagada (método "dLocal Go", recibo = número de orden). Si el aviso llega repetido, no se registra dos veces.
2. **Control diario** — cron de Vercel que recorre los suscriptos del plan y sus cobros (`/v1/subscription/plan/:plan_id/subscription/all` y `.../execution/all`), recupera avisos perdidos y genera la cuota del mes.
3. **Tesorería** — estado por jugador: suscripto / pago rechazado / sin suscripción / paga en efectivo; mandar el link de suscripción por WhatsApp a quien no está suscripto.
4. **Mi ficha** — botón "Pagar con tarjeta" con el link del plan.
5. **Claves** — `DLOCAL_API_KEY`, `DLOCAL_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY` solo en Vercel, tipo *Secret* y **sin** prefijo `VITE_` (nunca llegan al navegador ni al repo).

Falta definir: si el jugador carga su cédula al suscribirse en dLocal (para identificarlo sin errores).
