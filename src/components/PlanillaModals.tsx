import React, { useEffect, useMemo, useState } from 'react';
import { Player } from '../types';
import { ROLES_PLANILLA } from '../lib/opciones';

type RolPlanilla = Player['matchStatus']['lineupRole'];

const Marco: React.FC<{ titulo: string; subtitulo?: string; onClose: () => void; children: React.ReactNode; pie?: React.ReactNode }> = ({
  titulo,
  subtitulo,
  onClose,
  children,
  pie,
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
      <div className="flex items-center justify-between border-b border-[#e0e3e6] px-5 py-3">
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-[16px] text-[#00183a] truncate">{titulo}</h3>
          {subtitulo && <p className="font-sans text-[11px] text-[#747780]">{subtitulo}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1] shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3">{children}</div>
      {pie && <div className="border-t border-[#e0e3e6] px-5 py-3">{pie}</div>}
    </div>
  </div>
);

const ETIQUETA: Record<RolPlanilla, string> = { TITULAR: 'Titular', SUPLENTE: 'Suplente', RESERVA: 'Reserva', BAJA: 'Baja' };

/** Armar la convocatoria: titular / suplente / reserva / baja de todo el plantel de una vez. */
export const ConvocatoriaModal: React.FC<{
  abierto: boolean;
  players: Player[];
  onClose: () => void;
  /** Recibe solo los cambios. Devuelve false si no se pudo guardar. */
  onGuardar: (cambios: Record<string, RolPlanilla>) => Promise<boolean>;
}> = ({ abierto, players, onClose, onGuardar }) => {
  const [roles, setRoles] = useState<Record<string, RolPlanilla>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setRoles(Object.fromEntries(players.map((p) => [p.id, p.matchStatus.lineupRole])));
  }, [abierto, players]);

  const cambios = useMemo(
    () => Object.fromEntries(Object.entries(roles).filter(([id, r]) => players.find((p) => p.id === id)?.matchStatus.lineupRole !== r)),
    [roles, players]
  );

  if (!abierto) return null;

  const cuenta = (r: RolPlanilla) => Object.values(roles).filter((x) => x === r).length;

  return (
    <Marco
      titulo="Armar convocatoria"
      subtitulo={`${cuenta('TITULAR')} titulares · ${cuenta('SUPLENTE')} suplentes · ${cuenta('RESERVA')} reserva · ${cuenta('BAJA')} bajas`}
      onClose={onClose}
      pie={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold uppercase"
          >
            Cancelar
          </button>
          <button
            disabled={guardando || Object.keys(cambios).length === 0}
            onClick={async () => {
              setGuardando(true);
              const ok = await onGuardar(cambios);
              setGuardando(false);
              if (ok) onClose();
            }}
            className="flex-1 h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold uppercase disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : `Guardar (${Object.keys(cambios).length})`}
          </button>
        </div>
      }
    >
      {players.map((p) => (
        <div key={p.id} className="flex flex-col gap-1.5 pb-2.5 border-b border-[#f2f4f7] last:border-0">
          <span className="font-heading text-[13px] font-bold text-[#00183a]">
            {p.number != null && <span className="text-[#747780] mr-1">#{p.number}</span>}
            {p.firstName} {p.lastName}
          </span>
          <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label={`Rol de ${p.firstName} ${p.lastName}`}>
            {ROLES_PLANILLA.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={roles[p.id] === r}
                onClick={() => setRoles((prev) => ({ ...prev, [p.id]: r }))}
                className={`h-8 rounded-md font-heading text-[10px] font-bold ${
                  roles[p.id] === r
                    ? r === 'BAJA'
                      ? 'bg-[#b51a1b] text-white'
                      : 'bg-[#00183a] text-white'
                    : 'bg-[#f2f4f7] text-[#44474f]'
                }`}
              >
                {ETIQUETA[r]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Marco>
  );
};

/** Quién confirmó, quién avisó que falta y quién no respondió (de los convocados). */
export const AsistenciaModal: React.FC<{
  abierto: boolean;
  players: Player[];
  onClose: () => void;
  /** Abre el aviso por WhatsApp para los que no respondieron. */
  onRecordar?: (pendientes: Player[]) => void;
}> = ({ abierto, players, onClose, onRecordar }) => {
  if (!abierto) return null;
  const convocados = players.filter((p) => p.matchStatus.lineupRole !== 'BAJA');
  const confirmados = convocados.filter((p) => p.matchStatus.attendanceConfirmed === true);
  const ausentes = convocados.filter((p) => p.matchStatus.attendanceConfirmed !== true && p.matchStatus.declineReason);
  const pendientes = convocados.filter((p) => p.matchStatus.attendanceConfirmed !== true && !p.matchStatus.declineReason);

  const Grupo = ({ titulo, color, lista, detalle }: { titulo: string; color: string; lista: Player[]; detalle?: (p: Player) => string }) => (
    <div className="flex flex-col gap-1">
      <span className={`font-heading text-[11px] font-black uppercase tracking-wider ${color}`}>
        {titulo} ({lista.length})
      </span>
      {lista.length === 0 ? (
        <span className="font-sans text-[12px] text-[#747780]">Nadie</span>
      ) : (
        <ul className="rounded-lg border border-[#e0e3e6] divide-y divide-[#eceef1]">
          {lista.map((p) => (
            <li key={p.id} className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="font-heading text-[13px] font-bold text-[#00183a] truncate">
                {p.firstName} {p.lastName}
              </span>
              {detalle && <span className="font-sans text-[11px] text-[#44474f] truncate">{detalle(p)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Marco
      titulo="Asistencia al partido"
      subtitulo={`${confirmados.length} de ${convocados.length} convocados confirmaron`}
      onClose={onClose}
      pie={
        onRecordar && pendientes.length > 0 ? (
          <button
            onClick={() => onRecordar(pendientes)}
            className="w-full h-11 rounded-lg bg-[#25d366] text-white font-heading text-[12px] font-bold flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            Recordar a los que no respondieron ({pendientes.length})
          </button>
        ) : undefined
      }
    >
      <p className="font-sans text-[12px] text-[#44474f]">
        Cada jugador confirma o avisa que falta desde su app (Mi ficha).
      </p>
      <Grupo titulo="Confirmaron" color="text-emerald-700" lista={confirmados} detalle={(p) => ETIQUETA[p.matchStatus.lineupRole]} />
      <Grupo titulo="Avisaron que faltan" color="text-[#b51a1b]" lista={ausentes} detalle={(p) => p.matchStatus.declineReason ?? ''} />
      <Grupo titulo="Sin respuesta" color="text-[#b76e00]" lista={pendientes} />
    </Marco>
  );
};
