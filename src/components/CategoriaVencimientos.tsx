import React, { useState } from 'react';
import { Player } from '../types';

export type EstadoItem = 'vencido' | 'urgente' | 'proximo' | 'sin_dato' | 'ok' | 'excepcion';

export interface ItemVencimiento {
  player: Player;
  estado: EstadoItem;
  /** Días hasta el vencimiento (negativo = vencido). null = sin fecha. */
  dias: number | null;
  /** Fecha o explicación corta, ej. 'Vence 4 nov 2026'. */
  detalle: string;
}

/** Orden de la lista: vencidos, urgentes, por vencer, sin dato, al día, excepciones; dentro, por fecha. */
const PESO: Record<EstadoItem, number> = { vencido: 0, urgente: 1, proximo: 2, sin_dato: 3, ok: 4, excepcion: 5 };
export const ordenarItems = (items: ItemVencimiento[]) =>
  [...items].sort((a, b) => PESO[a.estado] - PESO[b.estado] || (a.dias ?? 0) - (b.dias ?? 0) || a.player.lastName.localeCompare(b.player.lastName));

/** Estado según los días que faltan. */
export const estadoPorDias = (dias: number, urgente: number, preventivo: number): EstadoItem =>
  dias <= 0 ? 'vencido' : dias <= urgente ? 'urgente' : dias <= preventivo ? 'proximo' : 'ok';

const ATENCION: EstadoItem[] = ['vencido', 'urgente', 'proximo', 'sin_dato'];

const CHIP: Record<EstadoItem, string> = {
  vencido: 'bg-[#b51a1b] text-white',
  urgente: 'bg-[#ffdad6] text-[#93000a]',
  proximo: 'bg-amber-100 text-amber-900',
  sin_dato: 'bg-[#e6e8eb] text-[#44474f]',
  ok: 'bg-emerald-100 text-emerald-800',
  excepcion: 'bg-[#d7e3ff] text-[#00183a]',
};

const textoChip = (i: ItemVencimiento) => {
  switch (i.estado) {
    case 'vencido':
      return i.dias === null ? 'Vencido' : i.dias === 0 ? 'Vence hoy' : `Vencido hace ${-i.dias} d`;
    case 'sin_dato':
      return 'Sin dato';
    case 'excepcion':
      return 'Excepción';
    default:
      return i.dias === 1 ? '1 día' : `${i.dias} días`;
  }
};

/**
 * Una categoría de Alertas (carné de salud, estudio, carné LUD): primero lo
 * vencido y lo que vence antes; "Ver todos" muestra también a los que están al día.
 */
export const CategoriaVencimientos: React.FC<{
  titulo: string;
  icono: string;
  colorIcono: string;
  items: ItemVencimiento[];
  /** Explicación corta debajo del título (opcional). */
  nota?: string;
  onAvisar?: (players: Player[]) => void;
  /** Tocar a un jugador abre sus documentos. */
  onAbrir?: (p: Player) => void;
  /** Algo más al final de cada fila (ej. la casilla "Recibido"). */
  extraFila?: (i: ItemVencimiento) => React.ReactNode;
  /** Contenido extra debajo de la nota (ej. editar la fecha de corte). */
  children?: React.ReactNode;
}> = ({ titulo, icono, colorIcono, items, nota, onAvisar, onAbrir, extraFila, children }) => {
  const [verTodos, setVerTodos] = useState(false);
  const ordenados = ordenarItems(items);
  const atencion = ordenados.filter((i) => ATENCION.includes(i.estado));
  const visibles = verTodos ? ordenados : atencion;
  const vencidos = items.filter((i) => i.estado === 'vencido').length;
  const porVencer = items.filter((i) => i.estado === 'urgente' || i.estado === 'proximo').length;
  const sinDato = items.filter((i) => i.estado === 'sin_dato').length;
  const avisables = atencion.map((i) => i.player);

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm border border-[#e0e3e6]/50 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorIcono}`}>
          <span className="material-symbols-outlined text-[20px]">{icono}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-[16px] font-bold text-[#00183a]">{titulo}</h3>
          <p className="font-sans text-[12px] text-[#44474f]">
            {vencidos || porVencer || sinDato
              ? [
                  vencidos && `${vencidos} vencido${vencidos === 1 ? '' : 's'}`,
                  porVencer && `${porVencer} por vencer`,
                  sinDato && `${sinDato} sin dato`,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Todos al día'}
          </p>
        </div>
        {vencidos > 0 && (
          <span className="font-heading text-[11px] font-bold bg-[#b51a1b] text-white rounded-full px-2 py-0.5 shrink-0">
            {vencidos}
          </span>
        )}
      </div>
      {nota && <p className="font-sans text-[11px] text-[#747780] -mt-1">{nota}</p>}
      {children}

      {visibles.length > 0 && (
        <div className="rounded-lg border border-[#e0e3e6] divide-y divide-[#eceef1]">
          {visibles.map((i) => (
            <div key={i.player.id} className="flex items-center gap-2 pr-3">
              <button
                type="button"
                onClick={onAbrir ? () => onAbrir(i.player) : undefined}
                disabled={!onAbrir}
                className="flex-1 min-w-0 flex items-center justify-between gap-2 pl-3 py-2 text-left enabled:active:bg-[#f2f4f7]"
              >
                <div className="min-w-0">
                  <p className="font-heading text-[13px] font-bold text-[#00183a] truncate">
                    {i.player.lastName}, {i.player.firstName}
                  </p>
                  <p className="font-sans text-[11px] text-[#747780] truncate">{i.detalle}</p>
                </div>
                <span className={`font-heading text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${CHIP[i.estado]}`}>
                  {textoChip(i)}
                </span>
              </button>
              {extraFila?.(i)}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {items.length > atencion.length ? (
          <button
            type="button"
            onClick={() => setVerTodos((v) => !v)}
            className="font-heading text-[11px] font-bold text-[#445e8d] underline"
          >
            {verTodos ? 'Ver solo los pendientes' : `Ver todos (${items.length})`}
          </button>
        ) : (
          <span />
        )}
        {onAvisar && avisables.length > 0 && (
          <button
            type="button"
            onClick={() => onAvisar(avisables)}
            className="h-9 px-3 rounded-lg bg-[#b51a1b] text-white font-heading text-[11px] font-bold uppercase flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">notifications_active</span>
            Avisar ({avisables.length})
          </button>
        )}
      </div>
    </section>
  );
};
