import { createContext, ReactNode, useContext } from 'react';

/**
 * Textos de la app que el admin puede cambiar desde "Club Admin → Textos de la app"
 * (datos del partido, temporada, etc.). Los valores guardados viven en la tabla
 * `textos_app`; si una clave no está guardada se usa el valor por defecto de acá.
 */
export const TEXTOS = {
  temporada: { grupo: 'Temporada', label: 'Temporada', valor: '2025' },
  torneo: { grupo: 'Temporada', label: 'Torneo', valor: 'Torneo Apertura 2025' },
  divisional: { grupo: 'Temporada', label: 'Divisional', valor: 'Divisional A' },
  categoria: { grupo: 'Temporada', label: 'Categoría del plantel', valor: 'Mayores' },

  fecha: { grupo: 'Próximo partido', label: 'Fecha del torneo', valor: 'Fecha 5' },
  rival: { grupo: 'Próximo partido', label: 'Rival', valor: 'Playa Pascual' },
  partido_dia: { grupo: 'Próximo partido', label: 'Día', valor: 'Domingo 27 de Abril' },
  partido_dia_corto: { grupo: 'Próximo partido', label: 'Día (formato corto, para el PDF)', valor: '27/04/2025' },
  partido_hora: { grupo: 'Próximo partido', label: 'Hora del partido', valor: '10:00 hs' },
  citacion_hora: { grupo: 'Próximo partido', label: 'Hora de citación', valor: '08:45 hs' },
  cancha: { grupo: 'Próximo partido', label: 'Cancha', valor: 'Complejo Deportivo Elbio • Cancha 1 (Carrasco)' },

  cuota_monto: { grupo: 'Tesorería', label: 'Valor de la cuota mensual ($)', valor: '1400' },
  cuota_dia_vencimiento: { grupo: 'Tesorería', label: 'Día del mes en que vence la cuota', valor: '10' },
  datos_pago: {
    grupo: 'Tesorería',
    label: 'Cómo pagar (lo ven los jugadores en Mi ficha)',
    valor: 'Transferencia BROU a la cuenta del club, o en efectivo al delegado.\nMandá el comprobante al tesorero.',
    multilinea: true,
  },

  delegado_nombre: { grupo: 'Contactos', label: 'Delegado: nombre', valor: 'Delegado' },
  delegado_celular: { grupo: 'Contactos', label: 'Delegado: celular (para WhatsApp)', valor: '' },
  tesorero_celular: { grupo: 'Contactos', label: 'Tesorería: celular (para avisar pagos)', valor: '' },

  aviso_dt: {
    grupo: 'Tablón del equipo',
    label: 'Aviso para el plantel (se ve en Mi ficha)',
    valor: 'Bienvenidos a la app del club. Acá van a ver los avisos del cuerpo técnico.',
    multilinea: true,
  },
  aviso_dt_autor: { grupo: 'Tablón del equipo', label: 'Firma del aviso', valor: 'Cuerpo Técnico' },

  dias_aviso_preventivo: { grupo: 'Alertas', label: 'Avisar vencimientos con cuántos días de anticipación', valor: '30' },
  dias_alerta_urgente: { grupo: 'Alertas', label: 'Alerta urgente: días antes de vencer', valor: '5' },
  bloquear_por_deuda: { grupo: 'Alertas', label: 'Inhabilitar por cuota vencida (si / no)', valor: 'no' },

  plantilla_vencimiento: {
    grupo: 'Plantillas de WhatsApp',
    label: 'Vencimiento de ficha médica o carné',
    valor:
      'Hola {nombre}, desde el Club Elbio Fernández te recordamos que tu {documento} vence el {vencimiento}. Para seguir habilitado en la Liga Universitaria, renovalo y avisale al delegado. ¡Arriba Elbio!',
    multilinea: true,
  },
  plantilla_cuota: {
    grupo: 'Plantillas de WhatsApp',
    label: 'Recordatorio de cuota',
    valor: 'Hola {nombre}, te recordamos que tenés pendiente la cuota del club (${deuda}). Cualquier duda, escribinos. ¡Gracias!',
    multilinea: true,
  },
  plantilla_convocatoria: {
    grupo: 'Plantillas de WhatsApp',
    label: 'Convocatoria / citación',
    valor:
      '⚽ Convocatoria {fecha} vs {rival}\n📅 {dia} · {hora}\n⏰ Citación {citacion}\n📍 {cancha}\nConfirmen asistencia en la app. ¡Arriba Elbio!',
    multilinea: true,
  },
  plantilla_cumpleanios: {
    grupo: 'Plantillas de WhatsApp',
    label: 'Saludo de cumpleaños',
    valor: '¡Feliz cumpleaños {nombre}! 🎉 Un abrazo grande de todo el Club Elbio Fernández.',
    multilinea: true,
  },

  club_direccion: { grupo: 'Club', label: 'Dirección de la sede', valor: 'Canelones 1382 esq. Ejido, Montevideo' },
  club_contacto: { grupo: 'Club', label: 'Contacto (teléfono / email)', valor: '' },
} as const satisfies Record<string, { grupo: string; label: string; valor: string; multilinea?: boolean }>;

export type ClaveTexto = keyof typeof TEXTOS;
export type Textos = Record<ClaveTexto, string>;

/** Datos del próximo partido: los puede cargar el admin y el cuerpo técnico. */
export const CLAVES_PARTIDO = (Object.keys(TEXTOS) as ClaveTexto[]).filter(
  (clave) => TEXTOS[clave].grupo === 'Próximo partido'
);

export const TEXTOS_DEFAULT = Object.fromEntries(
  Object.entries(TEXTOS).map(([clave, def]) => [clave, def.valor])
) as Textos;

/** Mezcla los valores guardados con los por defecto (ignora claves desconocidas o vacías). */
export function combinarTextos(guardados: Partial<Record<string, string>>): Textos {
  const res = { ...TEXTOS_DEFAULT };
  for (const clave of Object.keys(TEXTOS) as ClaveTexto[]) {
    const v = guardados[clave]?.trim();
    if (v) res[clave] = v;
  }
  return res;
}

const TextosContext = createContext<Textos>(TEXTOS_DEFAULT);

export function TextosProvider({ value, children }: { value: Textos; children: ReactNode }) {
  return <TextosContext.Provider value={value}>{children}</TextosContext.Provider>;
}

export function useTextos(): Textos {
  return useContext(TextosContext);
}
