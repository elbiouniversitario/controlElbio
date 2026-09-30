import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { CLUB_CREST_URL } from '../data/initialData';
import { nombrePeriodo } from '../lib/fechas';
import { useTextos } from '../lib/textos';
import { estadoHabilitacion } from '../lib/habilitacion';

export type Audiencia = 'deudores' | 'por_vencer' | 'plantel' | 'citados';

// Modal 1: New Mass Broadcast Modal
interface NewBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (targetAudience: Audiencia, message: string) => void;
  /** Cuántos jugadores hay en cada audiencia. */
  conteos: Record<Audiencia, number>;
}

export const NewBroadcastModal: React.FC<NewBroadcastModalProps> = ({
  isOpen,
  onClose,
  onSend,
  conteos,
}) => {
  const t = useTextos();
  const [audience, setAudience] = useState<Audiencia>('plantel');
  const [customMsg, setCustomMsg] = useState(
    'Hola {nombre}, te recordamos desde Club Elbio Fernández regularizar tu situación deportiva de cara a la próxima fecha de la Liga Universitaria. ¡Arriba Elbio!'
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00183a] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">campaign</span>
            </div>
            <div>
              <h3 className="font-heading font-bold text-[16px] text-[#00183a]">
                Nuevo Mensaje Masivo
              </h3>
              <p className="font-sans text-[11px] text-[#44474f]">
                Se abre en tu WhatsApp, listo para mandar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-heading text-[12px] font-bold text-[#00183a]">
            Audiencia Destinataria
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'por_vencer' as const, label: `Fichas/carnés por vencer (${conteos.por_vencer})` },
              { id: 'deudores' as const, label: `Cuotas pendientes (${conteos.deudores})` },
              { id: 'citados' as const, label: `Citados ${t.fecha} (${conteos.citados})` },
              { id: 'plantel' as const, label: `Todo el plantel (${conteos.plantel})` },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAudience(item.id)}
                className={`py-2 px-3 rounded-lg font-heading text-[11px] font-bold text-left transition-all border ${
                  audience === item.id
                    ? 'bg-[#00183a] text-white border-[#00183a] shadow-xs'
                    : 'bg-[#f2f4f7] text-[#44474f] border-[#e0e3e6] hover:bg-[#e6e8eb]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-heading text-[12px] font-bold text-[#00183a]">
            Cuerpo del Mensaje (con variables dinámicas)
          </label>
          <textarea
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            rows={4}
            className="w-full p-3 rounded-lg bg-[#f2f4f7] text-[#00183a] font-sans text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6] resize-none"
          ></textarea>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold uppercase"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSend(audience, customMsg);
              onClose();
            }}
            className="flex-1 h-11 rounded-lg bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[12px] font-bold uppercase shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal 2: Editor de una plantilla de WhatsApp (se guarda en "Textos de la app")
interface EditTemplateModalProps {
  /** Plantilla a editar; null = cerrado. */
  plantilla: { titulo: string; valor: string } | null;
  onClose: () => void;
  /** Devuelve false si no se pudo guardar. */
  onSave: (template: string) => Promise<boolean>;
}

export const EditTemplateModal: React.FC<EditTemplateModalProps> = ({ plantilla, onClose, onSave }) => {
  const [templateText, setTemplateText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTemplateText(plantilla?.valor ?? '');
  }, [plantilla]);

  if (!plantilla) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[#00183a] text-[22px]">edit_note</span>
            <h3 className="font-heading font-bold text-[16px] text-[#00183a] truncate">{plantilla.titulo}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="font-sans text-[12px] text-[#44474f]">
          Podés usar <code className="bg-[#e6e8eb] px-1 rounded">{'{nombre}'}</code>,{' '}
          <code className="bg-[#e6e8eb] px-1 rounded">{'{vencimiento}'}</code>,{' '}
          <code className="bg-[#e6e8eb] px-1 rounded">{'{documento}'}</code>,{' '}
          <code className="bg-[#e6e8eb] px-1 rounded">{'{deuda}'}</code> y los datos del partido (
          <code className="bg-[#e6e8eb] px-1 rounded">{'{rival}'}</code>,{' '}
          <code className="bg-[#e6e8eb] px-1 rounded">{'{dia}'}</code>,{' '}
          <code className="bg-[#e6e8eb] px-1 rounded">{'{citacion}'}</code>…): se completan solos en cada envío.
        </p>

        <textarea
          value={templateText}
          onChange={(e) => setTemplateText(e.target.value)}
          rows={6}
          className="w-full p-3 rounded-lg bg-[#f2f4f7] text-[#00183a] font-sans text-[16px] sm:text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6] resize-none select-text"
        ></textarea>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold uppercase"
          >
            Cancelar
          </button>
          <button
            disabled={saving || !templateText.trim()}
            onClick={async () => {
              setSaving(true);
              const ok = await onSave(templateText);
              setSaving(false);
              if (ok) onClose();
            }}
            className="flex-1 h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold uppercase shadow-sm active:scale-95 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar plantilla'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal 3: Payment Register Modal
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  player?: Player;
  /** Para elegir a quién cobrarle cuando se abre sin jugador (botón +). */
  players?: Player[];
  onConfirmPayment: (playerId: string, amount: number, method: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  player: jugadorInicial,
  players = [],
  onConfirmPayment,
}) => {
  const [method, setMethod] = useState('Transferencia BROU');
  const [elegidoId, setElegidoId] = useState('');

  useEffect(() => {
    if (isOpen) setElegidoId('');
  }, [isOpen]);

  if (!isOpen) return null;

  const deudores = players.filter((p) => p.dues.debtAmount > 0);
  const player = jugadorInicial ?? players.find((p) => p.id === elegidoId);
  const amount = player?.dues.debtAmount ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00183a] text-[22px]">
              add_card
            </span>
            <h3 className="font-heading font-bold text-[16px] text-[#00183a]">
              Registrar Cobro de Cuota
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {player ? (
          <div className="bg-[#f2f4f7] p-3 rounded-lg flex items-center gap-3 border border-[#e0e3e6]">
            <img
              src={player.avatarUrl}
              alt={player.firstName}
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div>
              <h4 className="font-heading font-bold text-[14px] text-[#00183a]">
                {player.firstName} {player.lastName} (#{player.number ?? '–'})
              </h4>
              <p className="font-sans text-[11px] text-[#44474f]">
                {player.position} • Período: {nombrePeriodo(player.dues.period)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="font-heading text-[12px] font-bold text-[#00183a]">Jugador</label>
            <select
              value={elegidoId}
              onChange={(e) => setElegidoId(e.target.value)}
              className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[16px] sm:text-[14px] text-[#00183a] outline-none border border-[#e0e3e6]"
            >
              <option value="">{deudores.length ? 'Elegí a quién cobrarle…' : 'Nadie tiene cuotas pendientes'}</option>
              {deudores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName} — ${p.dues.debtAmount.toLocaleString('es-UY')}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between bg-[#f2f4f7] rounded-lg px-3 py-2.5 border border-[#e0e3e6]">
          <span className="font-heading text-[12px] font-bold text-[#00183a]">A cobrar</span>
          <span className="font-heading font-bold text-[18px] text-[#00183a]">${amount.toLocaleString('es-UY')}</span>
        </div>
        {player && amount === 0 && (
          <p className="font-sans text-[12px] text-[#b76e00]">
            {player.firstName} no tiene cuotas pendientes. Si falta generar la cuota del mes, hacelo desde Tesorería.
          </p>
        )}
        {amount > 0 && (
          <p className="font-sans text-[11px] text-[#747780] -mt-2">Salda todas sus cuotas pendientes con un mismo recibo.</p>
        )}

        <div className="flex flex-col gap-1">
          <label className="font-heading text-[12px] font-bold text-[#00183a]">
            Método de Pago
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
          >
            <option value="Transferencia BROU">Transferencia BROU</option>
            <option value="Transferencia Santander">Transferencia Santander</option>
            <option value="Transferencia ITAÚ">Transferencia ITAÚ</option>
            <option value="Efectivo a delegado">Efectivo en mano al delegado</option>
            <option value="Tarjeta / POS">Tarjeta / POS Débito</option>
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold uppercase"
          >
            Cancelar
          </button>
          <button
            disabled={!player || amount === 0}
            onClick={() => {
              if (player) onConfirmPayment(player.id, amount, method);
              onClose();
            }}
            className="flex-1 h-11 rounded-lg bg-[#1b5e20] hover:bg-[#154a19] text-white font-heading text-[12px] font-bold uppercase shadow-sm active:scale-95 disabled:opacity-50"
          >
            Asentar Cobro
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal 4: Assign Role Modal (acceso del staff por email)
interface AssignRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Devuelve false si no se pudo guardar (el modal queda abierto). */
  onConfirm: (nombre: string, email: string, rol: 'admin' | 'dt' | 'tesorero') => Promise<boolean>;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'dt' | 'tesorero'>('dt');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const inputClass =
    'h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[16px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6] select-text';

  const handleConfirm = async () => {
    const limpio = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
      setError('Ingresá un email válido.');
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await onConfirm(name.trim(), limpio, role);
    setSaving(false);
    if (ok) {
      setName('');
      setEmail('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0d2d59] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <h3 className="font-heading font-bold text-[16px] text-[#00183a]">
              Dar acceso al staff
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="font-sans text-[12px] text-[#44474f] leading-snug">
          La persona crea su cuenta en la app con <strong>este mismo email</strong> y entra con el rol elegido.
          Los jugadores no necesitan acceso: entran con el email cargado en su ficha.
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-bold text-[#00183a] uppercase">
              Nombre y Apellido (opcional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Gonzalo Delgado"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-bold text-[#00183a] uppercase">Email</label>
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-bold text-[#00183a] uppercase">
              Rol en el Club
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'dt' | 'tesorero')}
              className={inputClass}
            >
              <option value="dt">Cuerpo técnico / Delegado</option>
              <option value="tesorero">Tesorería</option>
              <option value="admin">Administrador (acceso total)</option>
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-[#ffdad6] text-[#410002] px-3 py-2 font-sans text-[13px]">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold uppercase"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold uppercase shadow-sm active:scale-95 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Dar acceso'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal 5: Planilla Oficial PDF Preview Modal
interface PlanillaPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
}

export const PlanillaPdfModal: React.FC<PlanillaPdfModalProps> = ({
  isOpen,
  onClose,
  players,
}) => {
  const t = useTextos();
  if (!isOpen) return null;

  const convocados = players.filter((p) => p.matchStatus.lineupRole !== 'BAJA');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00183a]/75 backdrop-blur-xs p-3 animate-in fade-in duration-200">
      <div className="area-impresion w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] pb-3">
          <div className="flex items-center gap-2.5">
            <img src={CLUB_CREST_URL} alt="Crest" className="w-8 h-9 object-contain" />
            <div>
              <h3 className="font-heading font-bold text-[15px] text-[#00183a]">
                Planilla Oficial de Juego LUD
              </h3>
              <p className="font-sans text-[11px] text-[#44474f]">
                {t.torneo} • {t.fecha}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="no-imprimir w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Paper Sheet Preview */}
        <div className="bg-[#fafbfc] border border-[#c4c6d0] p-4 rounded-lg font-mono text-[11px] text-[#191c1e] shadow-inner space-y-3">
          <div className="text-center border-b border-[#e0e3e6] pb-2 font-heading">
            <p className="font-black text-[12px] uppercase">LIGA UNIVERSITARIA DE DEPORTES</p>
            <p className="text-[10px] text-[#44474f]">PLANILLA DE PARTIDO OFICIAL - CATEGORÍA MAYORES</p>
            <p className="text-[10px] font-bold text-[#b51a1b] mt-0.5">
              ELBIO FERNÁNDEZ vs {t.rival.toUpperCase()} • {t.partido_dia_corto} {t.partido_hora.toUpperCase()}
            </p>
          </div>

          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-[#e0e3e6] bg-[#f2f4f7] font-bold">
                <th className="p-1">#</th>
                <th className="p-1">Ficha</th>
                <th className="p-1">Jugador</th>
                <th className="p-1">Rol</th>
                <th className="p-1">Carné</th>
                <th className="p-1 text-center">Firma</th>
              </tr>
            </thead>
            <tbody>
              {convocados.slice(0, 11).map((p) => (
                <tr key={p.id} className="border-b border-[#eceef1]">
                  <td className="p-1 font-bold">{p.number ?? '–'}</td>
                  <td className="p-1">{p.ludRegistration.federatedId}</td>
                  <td className="p-1 truncate max-w-[110px]">
                    {p.lastName}, {p.firstName[0]}.
                  </td>
                  <td className="p-1 text-[9px] uppercase font-bold text-[#00183a]">
                    {p.matchStatus.lineupRole}
                  </td>
                  <td className={`p-1 text-[9px] font-bold ${estadoHabilitacion(p).habilitado ? 'text-[#1b5e20]' : 'text-[#b51a1b]'}`}>
                    {estadoHabilitacion(p).habilitado ? 'OK' : 'NO'}
                  </td>
                  <td className="p-1 text-center text-[#747780]">_________</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-2 border-t border-[#e0e3e6] flex justify-between text-[9px] text-[#44474f]">
            <span>Delegado: {t.delegado_nombre} (Firma: _________)</span>
            <span>Veedor LUD: _________</span>
          </div>
        </div>

        <div className="no-imprimir flex gap-2 pt-1">
          <button
            onClick={() => window.print()}
            className="flex-1 h-11 rounded-lg bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[12px] font-bold uppercase flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Imprimir Planilla A4
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold uppercase"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
