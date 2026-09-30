import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import {
  CARNE_EN_MANO,
  EMERGENCIAS_MOVILES,
  POSICIONES,
  PRESTADORES,
  RELACIONES,
  ROLES_PLANILLA,
} from '../lib/opciones';

interface EditarJugadorModalProps {
  player: Player | null;
  onClose: () => void;
  /** Devuelve false si no se pudo guardar (el formulario queda abierto). */
  onSave: (player: Player) => Promise<boolean>;
}

const inputClass =
  'h-11 w-full px-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-sans text-[16px] text-[#191c1e] outline-none focus:bg-white focus:border-[#00183a] select-text';
const labelClass = 'font-heading text-[11px] font-bold text-[#00183a] uppercase tracking-wide';

const Campo: React.FC<{ label: string; children: React.ReactNode; ayuda?: string }> = ({ label, children, ayuda }) => (
  <label className="flex flex-col gap-1">
    <span className={labelClass}>{label}</span>
    {children}
    {ayuda && <span className="font-sans text-[11px] text-[#747780] leading-snug">{ayuda}</span>}
  </label>
);

const Grupo: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <fieldset className="flex flex-col gap-3">
    <legend className="font-heading text-[10px] uppercase tracking-wider font-black text-[#b51a1b] mb-1">{titulo}</legend>
    {children}
  </fieldset>
);

/** Edición de la ficha de un jugador (DT / admin). */
export const EditarJugadorModal: React.FC<EditarJugadorModalProps> = ({ player, onClose, onSave }) => {
  const [draft, setDraft] = useState<Player | null>(player);
  const [numero, setNumero] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(player);
    setNumero(player?.number != null ? String(player.number) : '');
    setError(null);
  }, [player]);

  if (!player || !draft) return null;

  const set = (cambios: Partial<Player>) => setDraft((d) => (d ? { ...d, ...cambios } : d));

  const handleSave = async () => {
    const n = numero.trim() === '' ? null : Number(numero);
    if (!draft.firstName.trim() || !draft.lastName.trim()) return setError('Nombre y apellido no pueden quedar vacíos.');
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 99)) return setError('El número de camiseta va de 0 a 99.');
    if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
      return setError('El email no es válido.');
    setError(null);
    setSaving(true);
    const ok = await onSave({ ...draft, number: n });
    setSaving(false);
    if (ok) onClose();
  };

  // Posición cargada que no está en la lista (p. ej. de datos viejos): se agrega como opción.
  const posiciones = draft.position && !POSICIONES.includes(draft.position) ? [draft.position, ...POSICIONES] : POSICIONES;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] px-5 py-3">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[16px] text-[#00183a] truncate">
              Editar {player.firstName} {player.lastName}
            </h3>
            {player.documento && <p className="font-sans text-[11px] text-[#747780]">Cédula {player.documento}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1] shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5">
          <Grupo titulo="Jugador">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Nombre">
                <input className={inputClass} value={draft.firstName} onChange={(e) => set({ firstName: e.target.value })} />
              </Campo>
              <Campo label="Apellido">
                <input className={inputClass} value={draft.lastName} onChange={(e) => set({ lastName: e.target.value })} />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Número">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="–"
                />
              </Campo>
              <Campo label="Posición">
                <select className={inputClass} value={draft.position} onChange={(e) => set({ position: e.target.value })}>
                  <option value="">Sin definir</option>
                  {posiciones.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <label className="flex items-center gap-2 font-sans text-[14px] text-[#191c1e]">
              <input
                type="checkbox"
                className="w-5 h-5 accent-[#00183a]"
                checked={draft.isCaptain ?? false}
                onChange={(e) => set({ isCaptain: e.target.checked })}
              />
              Capitán
            </label>
          </Grupo>

          <Grupo titulo="Planilla">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Rol en el partido">
                <select
                  className={inputClass}
                  value={draft.matchStatus.lineupRole}
                  onChange={(e) =>
                    set({
                      matchStatus: {
                        ...draft.matchStatus,
                        lineupRole: e.target.value as Player['matchStatus']['lineupRole'],
                      },
                    })
                  }
                >
                  {ROLES_PLANILLA.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0) + r.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Carné LUD">
                <select
                  className={inputClass}
                  value={draft.ludRegistration.cardInHand}
                  onChange={(e) =>
                    set({
                      ludRegistration: {
                        ...draft.ludRegistration,
                        cardInHand: e.target.value as Player['ludRegistration']['cardInHand'],
                      },
                    })
                  }
                >
                  {CARNE_EN_MANO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </Grupo>

          <Grupo titulo="Contacto">
            <Campo label="Celular">
              <input
                className={inputClass}
                type="tel"
                inputMode="tel"
                value={draft.phone}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder="099 123 456"
              />
            </Campo>
            <Campo label="Email" ayuda="Opcional. Con este email el jugador también puede entrar con contraseña.">
              <input
                className={inputClass}
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={draft.email}
                onChange={(e) => set({ email: e.target.value })}
                placeholder="nombre@ejemplo.com"
              />
            </Campo>
            <Campo label="Dirección / barrio">
              <input className={inputClass} value={draft.address} onChange={(e) => set({ address: e.target.value })} />
            </Campo>
          </Grupo>

          <Grupo titulo="Contacto de emergencia">
            <Campo label="Nombre">
              <input
                className={inputClass}
                value={draft.emergencyContact.name}
                onChange={(e) => set({ emergencyContact: { ...draft.emergencyContact, name: e.target.value } })}
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Teléfono">
                <input
                  className={inputClass}
                  type="tel"
                  inputMode="tel"
                  value={draft.emergencyContact.phone}
                  onChange={(e) => set({ emergencyContact: { ...draft.emergencyContact, phone: e.target.value } })}
                />
              </Campo>
              <Campo label="Vínculo">
                <select
                  className={inputClass}
                  value={draft.emergencyContact.relation}
                  onChange={(e) =>
                    set({
                      emergencyContact: {
                        ...draft.emergencyContact,
                        relation: e.target.value as Player['emergencyContact']['relation'],
                      },
                    })
                  }
                >
                  {RELACIONES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </Grupo>

          <Grupo titulo="Cobertura médica">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Prestador">
                <select
                  className={inputClass}
                  value={draft.healthProvider}
                  onChange={(e) => set({ healthProvider: e.target.value })}
                >
                  <option value="">Sin definir</option>
                  {PRESTADORES.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Emergencia móvil">
                <select
                  className={inputClass}
                  value={draft.mobileEmergency}
                  onChange={(e) => set({ mobileEmergency: e.target.value as Player['mobileEmergency'] })}
                >
                  {EMERGENCIAS_MOVILES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo label="Nº de socio">
              <input
                className={inputClass}
                value={draft.memberNumber ?? ''}
                onChange={(e) => set({ memberNumber: e.target.value })}
              />
            </Campo>
          </Grupo>
        </div>

        <div className="border-t border-[#e0e3e6] px-5 py-3 flex flex-col gap-2">
          {error && (
            <p role="alert" className="rounded-lg bg-[#ffdad6] text-[#410002] px-3 py-2 font-sans text-[13px]">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-lg bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold uppercase disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
