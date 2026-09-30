import React, { useMemo, useState } from 'react';
import { Player } from '../types';

const Panel: React.FC<{ titulo: string; onClose: () => void; children: React.ReactNode }> = ({ titulo, onClose, children }) => (
  <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#00183a]/60 backdrop-blur-xs p-4 pt-[max(1rem,env(safe-area-inset-top))]">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
      <div className="flex items-center justify-between border-b border-[#e0e3e6] px-5 py-3">
        <h3 className="font-heading font-bold text-[16px] text-[#00183a]">{titulo}</h3>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      {children}
    </div>
  </div>
);

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Buscador de jugadores (nombre, apellido, número, cédula o posición). */
export const BuscadorJugadores: React.FC<{
  abierto: boolean;
  players: Player[];
  onClose: () => void;
  /** Qué hacer al tocar un jugador (p. ej. abrir su ficha para editar). */
  onElegir?: (p: Player) => void;
  describir: (p: Player) => string;
}> = ({ abierto, players, onClose, onElegir, describir }) => {
  const [q, setQ] = useState('');
  const resultados = useMemo(() => {
    const t = sinTildes(q.trim());
    if (!t) return players;
    return players.filter((p) =>
      sinTildes(`${p.firstName} ${p.lastName} ${p.number ?? ''} ${p.documento ?? ''} ${p.position}`).includes(t)
    );
  }, [q, players]);

  if (!abierto) return null;
  return (
    <Panel titulo="Buscar jugador" onClose={onClose}>
      <div className="px-5 pt-3">
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, número o cédula"
          className="w-full h-11 px-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-sans text-[16px] outline-none focus:bg-white focus:border-[#00183a] select-text"
        />
      </div>
      <ul className="overflow-y-auto px-5 py-3 divide-y divide-[#eceef1]">
        {resultados.length === 0 && <li className="py-3 font-sans text-[13px] text-[#44474f]">No hay jugadores con ese dato.</li>}
        {resultados.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={!onElegir}
              onClick={() => onElegir?.(p)}
              className="w-full text-left py-2.5 flex items-center gap-3 disabled:cursor-default"
            >
              <img src={p.avatarUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-[14px] font-bold text-[#00183a] truncate">
                  {p.number != null && <span className="text-[#747780] mr-1">#{p.number}</span>}
                  {p.firstName} {p.lastName}
                </span>
                <span className="block font-sans text-[11px] text-[#44474f] truncate">{describir(p)}</span>
              </span>
              {onElegir && <span className="material-symbols-outlined text-[18px] text-[#747780]">edit</span>}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

export interface Notificacion {
  id: string;
  icono: string;
  texto: string;
  urgente?: boolean;
  /** Acción al tocar (p. ej. ir a una pantalla). */
  onClick?: () => void;
}

export const PanelNotificaciones: React.FC<{ abierto: boolean; items: Notificacion[]; onClose: () => void }> = ({
  abierto,
  items,
  onClose,
}) => {
  if (!abierto) return null;
  return (
    <Panel titulo="Notificaciones" onClose={onClose}>
      <ul className="overflow-y-auto px-5 py-3 flex flex-col gap-2">
        {items.length === 0 && (
          <li className="py-6 text-center font-sans text-[13px] text-[#44474f]">
            <span className="material-symbols-outlined block text-[32px] text-emerald-600 mb-1">task_alt</span>
            No hay nada pendiente.
          </li>
        )}
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              disabled={!n.onClick}
              onClick={() => {
                n.onClick?.();
                onClose();
              }}
              className={`w-full text-left rounded-lg px-3 py-2.5 flex items-start gap-2.5 border disabled:cursor-default ${
                n.urgente ? 'bg-[#ffdad6]/50 border-[#ffdad6]' : 'bg-[#f2f4f7] border-[#e0e3e6]'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] shrink-0 ${n.urgente ? 'text-[#b51a1b]' : 'text-[#00183a]'}`}>
                {n.icono}
              </span>
              <span className="font-sans text-[13px] text-[#191c1e] leading-snug flex-1">{n.texto}</span>
              {n.onClick && <span className="material-symbols-outlined text-[18px] text-[#747780]">chevron_right</span>}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
};
