import React, { useState } from 'react';
import { Player } from '../types';
import { CLUB_CREST_URL } from '../data/initialData';
import { nombrePeriodo } from '../lib/fechas';
import { useTextos } from '../lib/textos';

// Modal 1: New Mass Broadcast Modal
interface NewBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (targetAudience: string, message: string) => void;
}

export const NewBroadcastModal: React.FC<NewBroadcastModalProps> = ({
  isOpen,
  onClose,
  onSend,
}) => {
  const t = useTextos();
  const [audience, setAudience] = useState<'deudores' | 'por_vencer' | 'plantel' | 'citados'>('por_vencer');
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
                Envío oficial WhatsApp Cloud API
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
              { id: 'por_vencer', label: 'Carnés por vencer (3)' },
              { id: 'deudores', label: 'Cuotas pendientes (8)' },
              { id: 'citados', label: `Citados ${t.fecha}` },
              { id: 'plantel', label: 'Todo el plantel (26)' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAudience(item.id as any)}
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
            <span className="material-symbols-outlined text-[18px]">send</span>
            Enviar Masivo
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal 2: Edit WhatsApp Template Modal
interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: string) => void;
}

export const EditTemplateModal: React.FC<EditTemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [templateText, setTemplateText] = useState(
    'Hola [Nombre], desde Club Elbio Fernández te recordamos que tu Carné de Salud vence el [Fecha]. Para mantenerte habilitado en la Liga Universitaria, gestioná tu renovación y envianos la foto de comprobante aquí. ¡Arriba Elbio! 🔴⚪🔵'
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00183a] text-[22px]">
              edit_note
            </span>
            <h3 className="font-heading font-bold text-[16px] text-[#00183a]">
              Editor de Plantilla HSM
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="font-sans text-[12px] text-[#44474f]">
          Esta plantilla está pre-aprobada por Meta Business. Modifica el texto manteniendo las
          etiquetas dinámicas <code className="bg-[#e6e8eb] px-1 rounded">[Nombre]</code> y{' '}
          <code className="bg-[#e6e8eb] px-1 rounded">[Fecha]</code>.
        </p>

        <textarea
          value={templateText}
          onChange={(e) => setTemplateText(e.target.value)}
          rows={5}
          className="w-full p-3 rounded-lg bg-[#f2f4f7] text-[#00183a] font-sans text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6] resize-none"
        ></textarea>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold uppercase"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(templateText);
              onClose();
            }}
            className="flex-1 h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold uppercase shadow-sm active:scale-95"
          >
            Guardar Plantilla
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
  onConfirmPayment: (playerId: string, amount: number, method: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  player,
  onConfirmPayment,
}) => {
  const [amount, setAmount] = useState(1400);
  const [method, setMethod] = useState('Transferencia BROU');

  if (!isOpen) return null;

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
                {player.firstName} {player.lastName} (#{player.number})
              </h4>
              <p className="font-sans text-[11px] text-[#44474f]">
                {player.position} • Período: {nombrePeriodo(player.dues.period)}
              </p>
            </div>
          </div>
        ) : (
          <p className="font-sans text-[12px] text-[#44474f]">
            Registro de ingreso manual para caja de tesorería del club.
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label className="font-heading text-[12px] font-bold text-[#00183a]">
            Monto en UYU ($)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-heading font-bold text-[16px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
          />
        </div>

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
            onClick={() => {
              if (player) onConfirmPayment(player.id, amount, method);
              onClose();
            }}
            className="flex-1 h-11 rounded-lg bg-[#1b5e20] hover:bg-[#154a19] text-white font-heading text-[12px] font-bold uppercase shadow-sm active:scale-95"
          >
            Asentar Cobro
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal 4: Assign Role Modal
interface AssignRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, ci: string, role: string) => void;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState('');
  const [ci, setCi] = useState('');
  const [role, setRole] = useState('Cuerpo Técnico & Delegado');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0d2d59] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <h3 className="font-heading font-bold text-[16px] text-[#00183a]">
              Asignar Nuevo Rol
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-bold text-[#00183a] uppercase">
              Nombre y Apellido
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Gonzalo Delgado"
              className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-bold text-[#00183a] uppercase">
              Cédula de Identidad (CI)
            </label>
            <input
              type="text"
              value={ci}
              onChange={(e) => setCi(e.target.value)}
              placeholder="4.567.890-1"
              className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-bold text-[#00183a] uppercase">
              Rol en el Club
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-12 px-3 rounded-lg bg-[#f2f4f7] font-sans text-[14px] text-[#00183a] outline-none focus:bg-white focus:ring-2 focus:ring-[#00183a] border border-[#e0e3e6]"
            >
              <option value="Cuerpo Técnico & Delegado">Cuerpo Técnico & Delegado</option>
              <option value="Administrador General / Tesorería">
                Administrador General / Tesorería
              </option>
              <option value="Jugador Plantel Mayores">Jugador Plantel Mayores</option>
            </select>
          </div>
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
              if (name) onConfirm(name, ci, role);
              onClose();
            }}
            className="flex-1 h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold uppercase shadow-sm active:scale-95"
          >
            Confirmar
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
      <div className="w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
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
                  <td className="p-1 font-bold">{p.number}</td>
                  <td className="p-1">{p.ludRegistration.federatedId}</td>
                  <td className="p-1 truncate max-w-[110px]">
                    {p.lastName}, {p.firstName[0]}.
                  </td>
                  <td className="p-1 text-[9px] uppercase font-bold text-[#00183a]">
                    {p.matchStatus.lineupRole}
                  </td>
                  <td className="p-1 text-[9px] text-[#1b5e20] font-bold">OK</td>
                  <td className="p-1 text-center text-[#747780]">_________</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-2 border-t border-[#e0e3e6] flex justify-between text-[9px] text-[#44474f]">
            <span>Delegado: Matías Romero (Firma: _________)</span>
            <span>Veedor LUD: Aprobado</span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
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
