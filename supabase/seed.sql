-- =============================================================================
-- Datos de ejemplo (los mismos que src/data/initialData.ts).
-- Correr en Supabase → SQL Editor DESPUÉS de la migración.
--
-- - Las fechas son relativas al día en que se corre (vencimientos de carné,
--   cuota del mes actual), para que las alertas tengan sentido.
-- - Las fotos quedan en NULL: la app muestra las iniciales. Las URLs de
--   AI Studio del prototipo son temporales y no se copian a la base.
-- - Se puede correr más de una vez: lo que ya existe no se duplica.
-- - Para borrar los datos de ejemplo antes de cargar jugadores reales:
--     delete from public.jugadores where id::text like '00000000-0000-4000-8000-%';
--     delete from public.mensajes_enviados where id::text like '00000000-0000-4000-9000-%';
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Jugadores (created_at escalonado para mantener el orden del prototipo)
-- -----------------------------------------------------------------------------
insert into public.jugadores (
  id, numero, nombre, apellido, posicion, categoria, anio_nacimiento,
  telefono, email, direccion, es_capitan,
  emergencia_nombre, emergencia_telefono, emergencia_relacion,
  prestador_salud, emergencia_movil, numero_socio, created_at
) values
  ('00000000-0000-4000-8000-000000000001', 10, 'Agustín', 'Moreira', 'Volante Ofensivo', 'Mayores Elbio U', 1999,
   '098 442 190', 'mateo.silva@elbiou.edu.uy', 'Pocitos / Canelones 2034', true,
   'Laura Martínez', '099 876 543', 'Padre/Madre', 'medica_uruguaya', 'SEMM', '142857-4', now() - interval '9 minutes'),
  ('00000000-0000-4000-8000-000000000002', 1, 'Lucas', 'Méndez', 'Arquero / Golero', 'Mayores Elbio U', 1998,
   '099 231 988', 'lucas.mendez@gmail.com', 'Parque Rodó / Bv. España 2210', false,
   'Jorge Méndez', '099 332 119', 'Padre/Madre', 'casmu', 'SUAT', '298711-0', now() - interval '8 minutes'),
  ('00000000-0000-4000-8000-000000000003', 7, 'Santiago', 'Varela', 'Extremo / Delantero', 'Mayores Elbio U', 2001,
   '091 876 221', 'santi.varela@adinet.com.uy', 'Buceo / Rivera 3412', false,
   'Florencia Sosa', '098 776 541', 'Pareja', 'espanola', 'UCM Falck', '887192-3', now() - interval '7 minutes'),
  ('00000000-0000-4000-8000-000000000004', 4, 'Mateo', 'Silveira', 'Defensa Central', 'Mayores Elbio U', 1998,
   '099 555 124', 'mateo.silveira@montevideo.com.uy', 'Malvín / Concepción del Uruguay 1490', false,
   'Carlos Silveira', '099 444 321', 'Padre/Madre', 'medica_uruguaya', 'SEMM', '112998-1', now() - interval '6 minutes'),
  ('00000000-0000-4000-8000-000000000005', 8, 'Sebastián', 'Gómez', 'Mediocampista', 'Mayores Elbio U', 2000,
   '098 123 789', 'seba.gomez@elbiou.edu.uy', 'Punta Carretas / Ellauri 450', false,
   'María Noel Gómez', '099 111 222', 'Padre/Madre', 'britanico', 'SEMM', null, now() - interval '5 minutes'),
  ('00000000-0000-4000-8000-000000000006', 5, 'Matías', 'Rivas', 'Zaguero / Lateral', 'Mayores Elbio U', 1999,
   '099 789 456', 'matias.rivas@gmail.com', 'Cordón / Constituyente 1820', false,
   'Rodrigo Rivas', '098 667 554', 'Hermano/a', 'smi', 'SUAT', null, now() - interval '4 minutes'),
  ('00000000-0000-4000-8000-000000000007', 9, 'Nicolás', 'Benítez', 'Centrodelantero', 'Mayores Elbio U', 1997,
   '092 112 334', 'nico.benitez@elbio.edu.uy', 'Carrasco / Alberdi 6100', false,
   'Valeria Benítez', '099 998 877', 'Hermano/a', 'cosem', 'SEMM', null, now() - interval '3 minutes'),
  ('00000000-0000-4000-8000-000000000008', 11, 'Martín', 'Castro', 'Extremo Izquierdo', 'Mayores Elbio U', 2002,
   '094 332 990', 'tincho.castro@gmail.com', 'Prado / Agraciada 2990', false,
   'Estela Castro', '099 220 011', 'Padre/Madre', 'casmu', 'UCM Falck', null, now() - interval '2 minutes'),
  ('00000000-0000-4000-8000-000000000009', 6, 'Joaquín', 'Méndez', 'Mediocentro Defensivo', 'Mayores Elbio U', 2001,
   '099 881 229', 'joaco.mendez@outlook.com', 'Parque Rodó / San Salvador 1740', false,
   'Pedro Méndez', '098 770 123', 'Padre/Madre', 'medica_uruguaya', 'SEMM', null, now() - interval '1 minute')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Carnés de salud (vencimiento = hoy + días restantes del prototipo)
-- -----------------------------------------------------------------------------
insert into public.carnes_salud (jugador_id, vencimiento, clinica, archivo_nombre, archivo_tamanio, verificado, notas)
select v.jugador_id::uuid, current_date + v.dias, v.clinica, v.archivo, v.tamanio, v.verificado, v.notas
from (values
  ('00000000-0000-4000-8000-000000000001', 235, 'Centro Médico Elbio Fernández - Dpto. Aptitud', 'carnet_salud_frente_dorso.jpg', '1.8 MB', true,  null),
  ('00000000-0000-4000-8000-000000000002', 242, 'Clínica Deportiva Parque Batlle', 'carnet_salud_lucas.pdf', '2.1 MB', true, null),
  ('00000000-0000-4000-8000-000000000003',  12, 'Asociación Española', null, null, true,  'Requiere renovación en 12 días.'),
  ('00000000-0000-4000-8000-000000000004', -18, 'Centro Médico Elbio', null, null, false, 'Ficha médica vencida.'),
  ('00000000-0000-4000-8000-000000000005',   2, 'Hospital Británico', null, null, true, null),
  ('00000000-0000-4000-8000-000000000006',   4, 'SMI Servicio Médico', null, null, true, null),
  ('00000000-0000-4000-8000-000000000007', 260, 'COSEM Medicina Deportiva', null, null, true, null),
  ('00000000-0000-4000-8000-000000000008',   5, 'CASMU Fisiatría', null, null, true, null),
  ('00000000-0000-4000-8000-000000000009', 173, 'Centro Médico Elbio', null, null, true, null)
) as v(jugador_id, dias, clinica, archivo, tamanio, verificado, notas)
where not exists (select 1 from public.carnes_salud c where c.jugador_id = v.jugador_id::uuid);

-- -----------------------------------------------------------------------------
-- Fichas LUD
-- -----------------------------------------------------------------------------
insert into public.fichas_lud (jugador_id, carne_en_mano, id_federado, categoria, consentimiento_firmado) values
  ('00000000-0000-4000-8000-000000000001', 'En mano del delegado', 48291, 'Mayores (Fútbol Universitario)', true),
  ('00000000-0000-4000-8000-000000000002', 'En mano del delegado', 44102, 'Mayores (Fútbol Universitario)', true),
  ('00000000-0000-4000-8000-000000000003', 'En poder del jugador', 50198, 'Mayores (Fútbol Universitario)', true),
  ('00000000-0000-4000-8000-000000000004', 'En poder del jugador', 46190, 'Mayores (Fútbol Universitario)', true),
  ('00000000-0000-4000-8000-000000000005', 'En mano del delegado', 49301, 'Mayores (Fútbol Universitario)', true),
  ('00000000-0000-4000-8000-000000000006', 'En mano del delegado', 47219, 'Mayores (Fútbol Universitario)', true),
  ('00000000-0000-4000-8000-000000000007', 'En mano del delegado', 43012, 'Mayores (Fútbol Universitario)', true),
  ('00000000-0000-4000-8000-000000000008', 'En mano del delegado', 51204, 'Mayores (Fútbol Universitario)', true),
  ('00000000-0000-4000-8000-000000000009', 'En mano del delegado', 48991, 'Mayores (Fútbol Universitario)', true)
on conflict (jugador_id) do nothing;

-- -----------------------------------------------------------------------------
-- Estado en planilla
-- -----------------------------------------------------------------------------
insert into public.estado_planilla (jugador_id, rol, asistencia_confirmada, motivo_baja) values
  ('00000000-0000-4000-8000-000000000001', 'TITULAR',  true,  null),
  ('00000000-0000-4000-8000-000000000002', 'TITULAR',  true,  null),
  ('00000000-0000-4000-8000-000000000003', 'SUPLENTE', false, null),
  ('00000000-0000-4000-8000-000000000004', 'BAJA',     false, 'Ficha médica inhabilitada por reglamento'),
  ('00000000-0000-4000-8000-000000000005', 'TITULAR',  true,  null),
  ('00000000-0000-4000-8000-000000000006', 'TITULAR',  true,  null),
  ('00000000-0000-4000-8000-000000000007', 'TITULAR',  true,  null),
  ('00000000-0000-4000-8000-000000000008', 'SUPLENTE', true,  null),
  ('00000000-0000-4000-8000-000000000009', 'TITULAR',  true,  null)
on conflict (jugador_id) do nothing;

-- -----------------------------------------------------------------------------
-- Cuotas del mes actual (y el mes anterior vencido de Mateo Silveira: debe 2 meses)
-- -----------------------------------------------------------------------------
insert into public.cuotas (jugador_id, periodo, monto, estado)
select v.jugador_id::uuid, (date_trunc('month', current_date) - make_interval(months => v.meses_atras))::date, 1400, v.estado
from (values
  ('00000000-0000-4000-8000-000000000001', 0, 'pagada'),
  ('00000000-0000-4000-8000-000000000002', 0, 'pagada'),
  ('00000000-0000-4000-8000-000000000003', 0, 'pendiente'),
  ('00000000-0000-4000-8000-000000000004', 1, 'vencida'),
  ('00000000-0000-4000-8000-000000000004', 0, 'vencida'),
  ('00000000-0000-4000-8000-000000000005', 0, 'pagada'),
  ('00000000-0000-4000-8000-000000000006', 0, 'pendiente'),
  ('00000000-0000-4000-8000-000000000007', 0, 'pagada'),
  ('00000000-0000-4000-8000-000000000008', 0, 'pagada'),
  ('00000000-0000-4000-8000-000000000009', 0, 'pagada')
) as v(jugador_id, meses_atras, estado)
on conflict (jugador_id, periodo) do nothing;

-- -----------------------------------------------------------------------------
-- Pagos de las cuotas pagadas (día del mes = fecha del prototipo)
-- -----------------------------------------------------------------------------
insert into public.pagos (cuota_id, jugador_id, monto, metodo, recibo, pagado_en)
select c.id, c.jugador_id, c.monto, v.metodo,
       coalesce(v.recibo, '#' || nextval('public.pagos_recibo_seq')),
       (c.periodo + (v.dia - 1)) + time '12:00'
from (values
  ('00000000-0000-4000-8000-000000000001', 'Transferencia BROU',      '#4819', 10),
  ('00000000-0000-4000-8000-000000000002', 'Efectivo a delegado',     '#429',   8),
  ('00000000-0000-4000-8000-000000000005', 'Transferencia Santander', null,     9),
  ('00000000-0000-4000-8000-000000000007', 'Transferencia ITAÚ',      null,    12),
  ('00000000-0000-4000-8000-000000000008', 'Transferencia BROU',      null,     5),
  ('00000000-0000-4000-8000-000000000009', 'Transferencia BROU',      null,     6)
) as v(jugador_id, metodo, recibo, dia)
join public.cuotas c
  on c.jugador_id = v.jugador_id::uuid
 and c.periodo = date_trunc('month', current_date)::date
where not exists (select 1 from public.pagos p where p.cuota_id = c.id);

-- -----------------------------------------------------------------------------
-- Reglas de automatización
-- -----------------------------------------------------------------------------
insert into public.reglas_automatizacion
  (clave, titulo, etiqueta, descripcion, activa, icono, clase_etiqueta, clase_icono_fondo, clase_icono_color, orden)
values
  ('carne_30_dias', 'Carné de Salud a 30 días', 'Prevención',
   'Aviso preventivo individual cada lunes a las 11:00 hs con enlace al prestador médico.',
   true, 'calendar_clock', null, 'bg-surface-container-high', 'text-primary', 1),
  ('alerta_urgente', 'Alerta Urgente (5 días y Vencidos)', 'Crítico',
   'Aviso automático por notificación al jugador cuando le falta poco para vencer, y el día que vence.',
   true, 'warning', 'bg-error-container text-on-error-container font-bold', 'bg-secondary-fixed', 'text-secondary', 2),
  ('cumpleanios', 'Saludo de Cumpleaños', '09:00 hs',
   'Felicitación de directiva y cuerpo técnico con sticker del escudo oficial del Club.',
   true, 'cake', 'bg-tertiary-fixed-dim/30 text-tertiary-container font-semibold', 'bg-tertiary-fixed', 'text-on-tertiary-fixed-variant', 3),
  ('cuota_mensual', 'Cuota Social Mensual', 'Día 1 al 10',
   'Recordatorio de liquidación de cuota deportiva y cuota de indumentaria anual.',
   true, 'payments', null, 'bg-surface-container-high', 'text-primary', 4)
on conflict (clave) do nothing;

-- -----------------------------------------------------------------------------
-- Mensajes enviados (hora de Montevideo)
-- -----------------------------------------------------------------------------
insert into public.mensajes_enviados (id, jugador_id, jugador_nombre, tema, tipo, estado, enviado_en) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000007', 'Nicolás Benítez',
   'Recordatorio de cuota', 'cuota', 'Entregado',
   ((current_date - 1) + time '19:24') at time zone 'America/Montevideo'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000008', 'Martín Castro',
   'Carné vence en 5d', 'carne', 'Leído',
   (current_date + time '08:31') at time zone 'America/Montevideo'),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000009', 'Joaquín Méndez',
   'Saludo de cumpleaños', 'cumpleanios', 'Leído',
   (current_date + time '09:00') at time zone 'America/Montevideo')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Roles del club
-- -----------------------------------------------------------------------------
insert into public.roles_club (clave, titulo, subtitulo, descripcion, etiqueta, icono, clase_icono, cantidad_activos, orden) values
  ('admin', 'Administrador General', 'Acceso Irrestricto',
   'Control de tesorería, auditoría, configuración de torneos, asignación de permisos y avisos al plantel.',
   'Privilegios Root', 'security', 'bg-primary-container text-on-primary-container', 2, 1),
  ('dt', 'Cuerpo Técnico & Delegados', 'Gestión de Cancha',
   'Carga de planillas de partido, control de semáforo de fichas médicas, convocatorias de fin de semana y asistencia a entrenamientos.',
   'Operatoria LUD', 'drive_file_rename', 'bg-surface-container-high text-primary', 4, 2),
  ('jugador', 'Jugadores', 'Portal Deportista',
   'Autogestión de perfil deportivo, carga de renovación de carné de salud, confirmación de citaciones y consulta de cuotas sociales.',
   'Autogestión Móvil', 'directions_run', 'bg-secondary-fixed text-on-secondary-fixed', 26, 3)
on conflict (clave) do nothing;

commit;

select 'Listo: datos de ejemplo cargados' as resultado;
