import React, { useMemo, useState } from 'react';
import { Player, RolClub } from '../types';

const ETIQUETA: Record<RolClub, string> = {
  jugador: 'Jugador',
  delegado: 'Delegado',
  dt: 'Cuerpo técnico',
};

const DESCRIPCION: Record<RolClub, string> = {
  jugador: 'Ve su ficha, sus cuotas y los avisos.',
  delegado: 'Ve el plantel, Alertas y la Planilla. Carga ficha médica, carné LUD y habilitación.',
  dt: 'Además arma la convocatoria, edita jugadores, da de alta y carga el próximo partido.',
};

/**
 * Admin: rol de cada jugador del plantel. Todos son jugadores; el admin puede
 * hacer a alguno delegado o cuerpo técnico para que lo ayude.
 */
export const RolesPlantel: React.FC<{
  players: Player[];
  /** Devuelve false si no se pudo guardar. */
  onAsignar: (p: Player, rol: RolClub) => Promise<boolean>;
}> = ({ players, onAsignar }) => {
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState<string | null>(null);

  const conRol = players.filter((p) => (p.rolClub ?? 'jugador') !== 'jugador');
  const lista = useMemo(() => {
    const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const q = sinTildes(busqueda.trim());
    if (!q) return conRol;
    return players.filter((p) => sinTildes(`${p.firstName} ${p.lastName} ${p.lastName} ${p.firstName}`).includes(q)).slice(0, 30);
  }, [players, conRol, busqueda]);

  const cambiar = async (p: Player, rol: RolClub) => {
    setGuardando(p.id);
    await onAsignar(p, rol);
    setGuardando(null);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e0e3e6]/60 flex flex-col gap-3">
      <div>
        <h4 className="font-heading font-bold text-[15px] text-[#00183a]">Roles del plantel</h4>
        <p className="font-sans text-[12px] text-[#44474f]">
          Todos los que se anotan son jugadores. Buscá a uno para hacerlo delegado o cuerpo técnico.
        </p>
      </div>

      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar jugador por nombre o apellido"
        className="h-11 px-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-sans text-[16px] sm:text-[14px] text-[#191c1e] outline-none focus:bg-white focus:border-[#00183a]"
      />

      {!busqueda.trim() && conRol.length === 0 && (
        <p className="font-sans text-[12px] text-[#747780]">Todavía nadie del plantel tiene un rol asignado.</p>
      )}
      {busqueda.trim() && lista.length === 0 && (
        <p className="font-sans text-[12px] text-[#747780]">No aparece nadie con ese nombre.</p>
      )}

      {lista.length > 0 && (
        <div className="rounded-lg border border-[#e0e3e6] divide-y divide-[#eceef1]">
          {lista.map((p) => {
            const rol = p.rolClub ?? 'jugador';
            return (
              <div key={p.id} className="px-3 py-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-[13px] font-bold text-[#00183a] truncate">
                    {p.lastName}, {p.firstName}
                  </span>
                  <select
                    value={rol}
                    disabled={guardando === p.id}
                    onChange={(e) => void cambiar(p, e.target.value as RolClub)}
                    aria-label={`Rol de ${p.firstName} ${p.lastName}`}
                    className="h-9 px-2 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-heading text-[12px] font-bold text-[#00183a] disabled:opacity-50"
                  >
                    {(Object.keys(ETIQUETA) as RolClub[]).map((r) => (
                      <option key={r} value={r}>
                        {ETIQUETA[r]}
                      </option>
                    ))}
                  </select>
                </div>
                {rol !== 'jugador' && <span className="font-sans text-[11px] text-[#747780]">{DESCRIPCION[rol]}</span>}
              </div>
            );
          })}
        </div>
      )}
      <p className="font-sans text-[11px] text-[#747780]">
        El cambio se aplica la próxima vez que esa persona abra la app.
      </p>
    </div>
  );
};
