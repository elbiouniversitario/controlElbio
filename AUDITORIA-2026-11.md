---
title: Auditoría Control Elbio — noviembre 2026
tags: [elbio, control-elbio, auditoria]
source: lectura del código en main (último commit 2026-10-16); nada probado contra la base real
---

# Auditoría Control Elbio — 2026-11-11

Es solo la lectura del código. **No se corrió la app ni se consultó la base de Supabase en producción.** Por eso todo lo que depende de la configuración real va marcado **VERIFICAR**.

---

## 1. Qué hace, en una frase

Lleva el padrón del plantel LUD y le dice a cada uno si **puede jugar** y **qué le falta**: ficha médica, estudio, carné LUD y cuota. Además manda **avisos push automáticos** antes de cada vencimiento. Encima de eso le crecieron la planilla del partido, la tesorería con recibos, el tablón, la confirmación de asistencia, los cumpleaños, los textos editables y un acta imprimible.

## 2. Cómo funciona

### 2.1 Quién entra y qué ve

| Rol | Cómo entra | Qué ve |
|---|---|---|
| admin | email + contraseña, está en `miembros_club` | todo |
| dt / delegado | email + contraseña (dt) o `rol_club` de jugador (delegado) | Alertas, Planilla, Nuevo jugador |
| tesorero | email + contraseña | Tesorería, Alertas |
| jugador | sesión anónima + `vincular_jugador(id, cédula, celular)`, o `anotarme()`, o email que coincide con el de su ficha | solo "Mi ficha" |

Hay **dos sistemas de rol en paralelo**:

- `miembros_club.rol`, por email.
- `jugadores.rol_club`: jugador / delegado / dt.

`mi_rol()` combina los dos. Un staff que además juega tiene el toggle "modo jugador", que se guarda en localStorage.

### 2.2 Regla de habilitación (`src/lib/habilitacion.ts`)

Se evalúa en este orden:

1. **Override manual** (con motivo): si existe, gana sobre todo.
2. Ficha médica vencida → no habilitado.
3. Estudio `vencido` (examen en o antes del corte) → no habilitado.
4. BAJA → no habilitado.
5. Cuota vencida → no habilitado, **solo si** `bloquear_por_deuda = "si"`.

El carné LUD vencido **no inhabilita**: solo genera alerta.

Estudio (`src/lib/estudio.ts`):

- El corte automático es el 31/10 de (temporada − 2). Se puede pisar con el texto `estudio_corte`.
- Las excepciones son "recibido" y "artículo".
- El corte se guarda en una variable global del módulo, que App vuelve a setear en cada render. Funciona, pero es frágil.

### 2.3 Avisos

**Automáticos.** Corre `api/avisos-automaticos.ts`, un cron de Vercel diario a las 12:00 UTC = 09:00 Uruguay:

- **Ficha médica y carné LUD:** hitos a 30 días (regla `carne_30_dias`), a 5 días y el día del vencimiento (`alerta_urgente`). Hay tolerancia de 3 días después de vencido.
- **Cuota:** 3 días antes y el día de vencimiento (día 10 por defecto).
- **Cumpleaños.**
- **Resumen a delegados:** a quién le va a vencer la cuota y quién debe. Sale los lunes y los días 1 a 3 después del vencimiento.
- **Dedupe** por (jugador, tipo, referencia, hito). Si el jugador no tiene suscripción push, el aviso no se marca como enviado y se reintenta.

**Manuales.** Van por `api/notificar.ts`, que exige token de staff y usa el RPC `push_destinos`. Se puede elegir a quién mandar: por vencer, deudores, citados o todo el plantel. Se llega al **mismo** `EnvioAvisoModal` desde cinco lados: Alertas, Tesorería, Planilla, "Convocar" y el modal de difusión.

### 2.4 Datos

Son 15 tablas:

- **Núcleo:** `jugadores`, `carnes_salud`, `fichas_lud`, `estado_planilla`, `cuotas`, `pagos`.
- **Configuración:** `reglas_automatizacion`, `roles_club`, `textos_app`, `miembros_club`.
- **Mensajería:** `mensajes_enviados`, `push_suscripciones`, `avisos_automaticos`.
- **Acceso:** `vinculos_jugador`, `intentos_vinculo`.
- **Archivos:** fotos de carnés en el bucket privado `documentos`.

Las migraciones son 10 archivos `.sql` que se pegan a mano en el SQL Editor. Varias funciones se redefinen de una migración a otra, así que la versión vigente es la del archivo más nuevo que la toque.

---

## 3. Seguridad — hallazgos (todos VERIFICAR contra la base real)

| # | Hallazgo | Impacto | Dónde |
|---|---|---|---|
| S1 | El límite de 5 cédulas incorrectas es **por sesión anónima**. Si se abre otra sesión anónima, el contador vuelve a cero | Se puede adivinar la cédula a fuerza bruta (con el dígito verificador, el espacio real es chico) | `20260930010000_vincular_jugador.sql:112` |
| S2 | `plantel_para_vincular()` devuelve nombre y apellido de **todo el plantel activo** a cualquier sesión anónima | Cualquiera con el link baja la lista de jugadores | idem, l.75 |
| S3 | `anotarme()` permite autoalta sin aprobación | Un extraño se agrega al padrón y entra a la app | `20261004000000_anotarse_y_roles.sql` |
| S4 | En `mi_jugador_id()`, el fallback por email solo es seguro si Supabase **exige confirmar el email**. Si no lo exige, alguien se registra con el email de otro y ve su ficha | Ver la ficha de un tercero | `..._vincular_jugador.sql:63` — **VERIFICAR** el setting en Auth |
| S5 | Delegado y dt pueden hacer UPDATE de **cualquier columna** de `jugadores` (`rol_club`, `activo`, `documento`) directo por PostgREST, salteando el RPC que es solo de admin | Un delegado se sube el rol o cambia la cédula de otro | políticas RLS de `jugadores` — **VERIFICAR** la versión vigente |
| S6 | Sigue existiendo la `generar_cuotas_mes` vieja | Código muerto con permisos | migraciones |
| S7 | El atajo "Convocar" aparece también para el **jugador**. La UI lo deja intentar y falla en `push_destinos` | Confusión. No es una brecha, porque el server lo frena | `App.tsx`, acciones rápidas |
| S8 | En la memoria de Supabase/Elbio figura **pendiente rotar la `service_role`** de elbio-cuotas. **VERIFICAR** si este proyecto comparte esa clave: el cron la usa | Si es la misma, la clave expuesta tiene acceso total | `api/avisos-automaticos.ts` + env de Vercel |

---

## 4. Inventario de información por pantalla (insumo para el paso 2)

Leyenda: **✔** = núcleo, se queda · **≈** = repetido en otra pantalla · **✘** = candidato a sacar.

### Capa común (arriba de TODAS las pantallas, para todos los roles)

- ≈ **Tarjetas resumen** (Urgentes / Cuotas / Plantel). Al jugador no le sirven y en las pantallas de staff repiten los contadores propios de cada una.
- ≈ **"Acciones rápidas"** (Convocar / Alertas / Cuotas). Hacen lo mismo que la barra inferior.
- ≈ **Cinta de chips "Vistas"**. Es la tercera navegación: chips + barra inferior + acciones rápidas.
- ✘ El contador de urgentes usa un **5 fijo** en lugar de `dias_alerta_urgente`.

### Alertas y vencimientos

- ✘ Banner con escudo "Avisos al plantel".
- Sub-pestañas Avisos / Historial / Plantillas:
  - ✔ Tres listas de vencimientos: ficha médica, estudio y carné LUD. **Es el corazón de la app.**
  - ≈ El editor del corte de estudio está acá **y también** en Club → Textos.
  - ≈ "Otros avisos": convocatoria, cuotas, cumpleaños. Convocatoria y cuotas ya tienen su propia pantalla.
  - ≈ "Avisos activos" (toggles de reglas). Es configuración: va en Club.
  - ≈ "Últimos envíos" (3) repite Historial.
  - ≈ Plantillas editables acá **y también** en Club → Textos. La plantilla de estudio está fija en el código y no se puede editar.
- ≈ Botón "Crear mensaje al plantel": es la quinta entrada al mismo modal.

### Planilla (DT) — título en inglés: "Match Sheet Ops"

- ✔ Convocados / en duda / inhabilitados.
- ≈ Contadores Convocados / Listos / Carnés / Hábiles.
- ✘ Checklist "carnés en el bolso" (VERIFICAR si se usa).
- ✘ "Cartel para el plantel".
- ✔ PDF de planilla con veedor LUD (VERIFICAR si la LUD lo pide en ese formato).

### Tesorería

- ✔ Quién pagó y quién debe, y registrar el pago.
- ≈ Contadores Al día / Avisar / Revisar / Recaudado.
- ✘ Marca "Capitán".
- Medios de pago: BROU / Santander / ITAÚ / efectivo al delegado / POS. Son cinco; **VERIFICAR** cuáles se usan de verdad.
- Recibo numerado desde 5000, imprimible. En modo demo el número es aleatorio.
- ✘ El monto 1400 está fijo como respaldo en varios lugares.

### Mi ficha (jugador) — título "Mi Perfil Deportista"

- ✔ Píldora "Habilitado / No habilitado: motivo". **Es lo único que el jugador necesita ver primero.**
- ✔ Vencimientos de ficha médica y carné LUD.
- ≈ "Próxima Citación Oficial" con Voy / Avisar ausencia. Se guarda en el server; "Modificar" vuelve a *pendiente* solo en pantalla, sin guardar.
- ✘ "Ficha #ID federado" y "Carné físico: en mano". Datos que el jugador no usa.
- ✔ Mi cuota: debo / pagué, y "Cómo pagar".
- ≈ Recibo imprimible.
- ✘ "Tablón del equipo" con "Marcar como leído": se guarda solo en el celular y nadie lo ve. El aviso ya llega por push.
- ✔ "Escribir al delegado" (WhatsApp).
- Tarjeta para activar las notificaciones.

### Club (admin) — título "Configuración General"

- ≈ Contadores Plantel / Total / Habilitados / Push / Activos: la **tercera** fila de contadores de la app.
- ≈ "Tu perfil de jugador".
- ✔ Roles del plantel y staff. Hoy son dos sistemas de rol.
- ✔ Textos de la app: parte es configuración real (monto, día de vencimiento, delegado) y parte es copy (tablón, plantillas).
- ✔ Acta de habilitaciones imprimible.

### Alta de jugador (wizard de 3 pasos, 967 líneas)

- ✔ Nombre, apellido, cédula, año, celular.
- ✘ Email, dirección, contacto de emergencia (nombre y teléfono), número de socio, prestador médico, notas médicas, ID federado, número de camiseta.
  - De estos, la app **usa** el email (login de staff y fallback) y quizás la camiseta para la planilla. El resto se carga y no se usa en ningún cálculo ni aviso (VERIFICAR camiseta y prestador).

### Modales sueltos

Son unos 10 modales globales que viven en `App.tsx`: pago, rol, PDF, documentos, editar, envío, etc. `DocumentosModal` concentra override, ficha nueva, carné LUD y estudio. **Funciona bien así; conviene mantenerlo.**

---

## 5. Deuda técnica

- `App.tsx` 1144 líneas, con ~20 `useState` y 10 modales. El wizard tiene 967 líneas y Club 780.
- **Dos sistemas de rol** que hay que cruzar en cada política.
- La **ficha médica está modelada dos veces** (`carnes_salud` y campos en `jugadores`/`fichas_lud`).
- **Clases CSS e íconos guardados en la base** (`reglas_automatizacion`, `roles_club`). La UI depende de datos.
- `mensajes_enviados` tiene los estados 'Leído' / 'Entregado', pero nunca se actualizan: todo queda 'Enviado'.
- **Plantillas por defecto duplicadas** en el cron (`POR_DEFECTO`) y en `src/lib/textos.tsx`.
- Campos sin uso real: `verificado`, `archivo_nombre/tamanio`, `consentimiento_firmado`, `id_federado`, `carne_en_mano`, `numero_socio`, dirección, etc.
- Títulos en inglés mezclados ("Match Sheet Ops").
- Migraciones a mano y sin registro de cuáles se corrieron.

---

## 6. Dirección para el paso 2 (no es diseño, es criterio)

La app tiene **un trabajo central**: *¿quién puede jugar y quién está por dejar de poder?*, más el aviso automático. Lo demás es accesorio. Propuesta de recorte:

1. **Jugador = una sola pantalla.** Semáforo grande, qué le falta con su fecha, y "cómo pagar / escribir al delegado". Sin resumen, sin tablón, sin ID federado.
2. **Staff = una lista con filtro**, no cinco pantallas con contadores. "Plantel" con estado por jugador (ficha / estudio / LUD / cuota) y filtros *no habilita · vence pronto · debe*. Tocar un jugador abre su ficha y ahí se registra el pago o el documento.
3. **Un solo lugar para mandar mensajes**, y **un solo lugar para configurar**: monto, días, corte, plantillas y reglas.
4. **Un solo sistema de roles**: admin / staff / jugador, con permisos chicos por función si hacen falta.
5. **Alta mínima**: nombre, cédula, celular, año. Lo demás, opcional dentro de la ficha.
6. Decidir con el club si Planilla, asistencia, cumpleaños, tablón y recibo **se quedan o se van**. Son las piezas que más pantalla ocupan.
7. Cerrar antes S1–S5. Si se reescribe, va directo en el modelo nuevo.

Preguntas que tiene que contestar el club antes del rediseño:

- ¿Quién la usa de verdad en el staff, y para qué?
- ¿Los jugadores la abren o solo reciben el push?
- ¿Se usa la planilla del partido y la confirmación de asistencia?
- ¿La tesorería se lleva acá o en otro lado (elbio-cuotas)?
