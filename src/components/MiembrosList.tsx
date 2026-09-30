import React, { useState } from 'react';
import { Miembro } from '../lib/db';

const NOMBRE: Record<Miembro['rol'], string> = {
  admin: 'Administrador',
  dt: 'Cuerpo técnico / Delegado',
  tesorero: 'Tesorería',
};

interface MiembrosListProps {
  miembros: Miembro[];
  /** Email de quien está usando la app (no puede quitarse a sí mismo). */
  miEmail?: string;
  onQuitar: (email: string) => Promise<void>;
}

/** Staff con acceso a la app (Club Admin → Accesos). */
export const MiembrosList: React.FC<MiembrosListProps> = ({ miembros, miEmail, onQuitar }) => {
  const [confirmando, setConfirmando] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e0e3e6]/60 divide-y divide-[#eceef1]">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <span className="font-heading text-[11px] font-black uppercase tracking-wider text-[#b51a1b]">
          Accesos del staff
        </span>
        <span className="font-heading text-[10px] text-[#44474f] font-bold">{miembros.length}</span>
      </div>
      {miembros.length === 0 && (
        <p className="px-4 py-3 font-sans text-[12px] text-[#44474f]">Todavía no hay nadie habilitado.</p>
      )}
      {miembros.map((m) => (
        <div key={m.email} className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-heading text-[13px] font-bold text-[#00183a] truncate">{m.nombre || m.email}</p>
            <p className="font-sans text-[11px] text-[#44474f] truncate">
              {m.nombre ? `${m.email} · ` : ''}
              {NOMBRE[m.rol]}
            </p>
          </div>
          {m.email === miEmail ? (
            <span className="font-heading text-[10px] font-bold text-[#747780] shrink-0">Vos</span>
          ) : confirmando === m.email ? (
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmando(null)}
                className="h-8 px-2.5 rounded-lg bg-[#eceef1] font-heading text-[11px] font-bold text-[#00183a]"
              >
                No
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onQuitar(m.email);
                  setConfirmando(null);
                }}
                className="h-8 px-2.5 rounded-lg bg-[#b51a1b] font-heading text-[11px] font-bold text-white"
              >
                Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(m.email)}
              aria-label={`Quitar acceso a ${m.email}`}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1] shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">person_remove</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
