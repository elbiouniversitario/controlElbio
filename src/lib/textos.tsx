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
  cancha_corta: { grupo: 'Próximo partido', label: 'Cancha (corto)', valor: 'Cancha 1 Carrasco' },

  cuota_dia_vencimiento: { grupo: 'Tesorería', label: 'Día del mes en que vence la cuota', valor: '10' },
} as const satisfies Record<string, { grupo: string; label: string; valor: string }>;

export type ClaveTexto = keyof typeof TEXTOS;
export type Textos = Record<ClaveTexto, string>;

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
