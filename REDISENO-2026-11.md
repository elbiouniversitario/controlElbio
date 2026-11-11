---
title: Rediseño Control Elbio — requisitos
tags: [elbio, control-elbio, rediseño]
source: preguntas y respuestas con Nacho, 2026-11-11
---

# Rediseño Control Elbio — requisitos (2026-11-11)

La app va a cubrir tres cosas: **documentos, plata y asistencia a prácticas**, y manda avisos sobre las tres.
Todo lo del partido se saca: citación, convocatoria, planilla LUD y confirmación de asistencia.
Hay un solo plantel.

## Roles (son tres, cada uno incluye al anterior)

| Rol | Ve y hace |
|---|---|
| **Jugador** | Su estado y su plata (ver abajo) |
| **Delegado** | Todo lo del jugador sobre **su propia** ficha, más el plantel, documentos, avisos, quién debe y prácticas |
| **Tesorero** | Todo lo del delegado, más la caja completa, confirmar pagos, crear cobros, gastos, configuración y asignación de roles |

- El rol admin desaparece y su parte la absorbe el tesorero.
- La mayoría del staff también juega, así que su propia ficha tiene que estar a un toque.
- **Todos entran con celular + cédula.** El rol lo asigna el tesorero desde la app.
- **El staff además usa un PIN propio** de 4 a 6 dígitos, que se pide para pasar a la vista de staff. El PIN se guarda hasheado en la base y lo crea cada uno la primera vez que entra. Si se lo olvida, el tesorero lo resetea.
- El límite de intentos (cédula y PIN) se cuenta **por jugador**, no por sesión. Así se cierra el hallazgo S1.

## Jugador

- **¿Estoy habilitado?** Semáforo con lo que le falta y la fecha de cada vencimiento: ficha médica, estudio y carné LUD.
- **Mi plata**: la cuota del mes y los otros cobros (asado, indumentaria, etc.), con lo que debe en cada uno.
- **Informar un pago**: elige el cobro, el medio (transferencia / efectivo) y, si quiere, adjunta una foto. Queda *pendiente* hasta que el tesorero lo confirma.
- **Mis prácticas**: "fuiste a X de Y".
- Activar notificaciones.

## Delegado

- **Plantel** con el estado de cada jugador. Filtros: *no habilita · vence pronto · debe*.
- **Alta de jugador** con lo mínimo: nombre, cédula, celular y año.
- **Cargar documentos**: ficha médica, carné LUD, estudio y override de habilitación.
- **Mandar avisos** (push manual): a todos o a un grupo.
- **Quién debe**, sin ver la caja.
- **Prácticas**:
  1. Pega la lista que se armó en el chat de WhatsApp.
  2. La app asocia cada nombre de la lista con un jugador del plantel.
  3. El delegado corrige lo que no matcheó, completa día, hora y lugar, y confirma.
  4. Queda un ranking de % de asistencia por jugador, filtrable por período.

## Tesorero (además de lo del delegado)

- **Caja**: ingresos (cuotas y cobros confirmados) y gastos, con el saldo.
- **Confirmar o rechazar pagos informados**, con la foto si la hay.
- **Crear un cobro**: concepto (Asado 15/11, Indumentaria…) y a quién se le cobra, **con monto propio por jugador**.
- **Cuota mensual**: un monto general, con excepciones por jugador (descuento, beca o exonerado).
- **Gastos**: monto, fecha y descripción en texto libre.
- **Configuración**: monto y día de vencimiento de la cuota, corte de estudio, plantillas de avisos y reglas automáticas.
- **Roles**: quién es delegado y quién tesorero.

## Reglas de negocio

- **Habilitación = solo documentos.** El orden es: override, ficha médica, estudio, baja. **La deuda no inhabilita**, solo avisa; se elimina `bloquear_por_deuda`.
- El carné LUD vencido avisa pero no inhabilita (igual que hoy).
- Avisos automáticos que se mantienen:
  - vencimiento de documentos (a 30 días, a 5 días y el día);
  - cuota y cobros ("te cargaron Asado $500" y cuota por vencer);
  - resumen semanal a los delegados;
  - cumpleaños.

## Datos

- Se trabaja sobre **la misma base de Supabase, migrando**: se conservan jugadores, documentos, pagos y suscripciones push.
- Un solo sistema de roles. Se eliminan `miembros_club` y el login con email.
- Tablas nuevas o cambiadas (borrador): `cobros` (concepto, fecha), `cargos` (cobro × jugador × monto), `pagos` con estado `informado/confirmado/rechazado` y foto, `gastos`, `practicas` y `asistencias`, y excepción de monto de cuota por jugador.

## Pendientes antes de diseñar

- [ ] **Ejemplo real de la lista de WhatsApp** pegada (formato de nombres, numeración, apodos).
- [x] Seguridad del login: se decidió PIN para el staff (2026-11-11).
- [ ] Diseño con `ui-ux-pro-max`, después construcción con `frontend-design`.
