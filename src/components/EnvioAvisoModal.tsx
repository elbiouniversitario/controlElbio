import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { rellenarPlantilla } from '../lib/whatsapp';
import { useTextos } from '../lib/textos';
import { variablesMensaje } from '../lib/mensajes';
import { isSupabaseConfigured } from '../lib/supabase';
import { jugadoresConPush, mandarNotificaciones } from '../lib/push';

export interface EnvioAviso {
  titulo: string;
  /** Título de la notificación y tema con el que queda en el historial. */
  tema: string;
  /** Texto con {nombre}, {vencimiento}, etc. */
  plantilla: string;
  destinatarios: Player[];
  /** Valores propios de este envío para la plantilla (ej. {documento} y {vencimiento} de una categoría). */
  variablesExtra?: (p: Player) => Record<string, string>;
}

interface EnvioAvisoModalProps {
  envio: EnvioAviso | null;
  onClose: () => void;
  /** Registra en el historial a quienes les llegó el aviso. */
  onRegistrar: (destinatarios: Player[], tema: string) => void;
}

/**
 * Manda un aviso por notificación de la app a cada jugador (texto
 * personalizado). Muestra quién no activó las notificaciones.
 */
export const EnvioAvisoModal: React.FC<EnvioAvisoModalProps> = ({ envio, onClose, onRegistrar }) => {
  const t = useTextos();
  const [texto, setTexto] = useState('');
  const [conPush, setConPush] = useState<Set<string> | null>(null);
  const [notificados, setNotificados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  useEffect(() => {
    setTexto(envio?.plantilla ?? '');
    setNotificados(new Set());
    setResultado(null);
    setConPush(null);
    if (!envio || !isSupabaseConfigured) return;
    let cancelado = false;
    jugadoresConPush()
      .then((ids) => !cancelado && setConPush(ids))
      .catch(() => !cancelado && setConPush(new Set()));
    return () => {
      cancelado = true;
    };
  }, [envio]);

  if (!envio) return null;

  const activos = envio.destinatarios.filter((p) => conPush?.has(p.id));
  const sinActivar = envio.destinatarios.filter((p) => conPush && !conPush.has(p.id));
  const pendientes = activos.filter((p) => !notificados.has(p.id));

  const mandar = async () => {
    if (pendientes.length === 0 || enviando) return;
    setEnviando(true);
    setResultado(null);
    try {
      const r = await mandarNotificaciones(
        envio.tema,
        pendientes.map((p) => ({
          jugadorId: p.id,
          cuerpo: rellenarPlantilla(texto, { ...variablesMensaje(t, p), ...envio.variablesExtra?.(p) }),
        }))
      );
      const llegaron = pendientes.filter((p) => r.enviados.includes(p.id));
      setNotificados((prev) => new Set([...prev, ...llegaron.map((p) => p.id)]));
      if (llegaron.length) onRegistrar(llegaron, envio.tema);
      const faltan = pendientes.length - llegaron.length;
      setResultado(
        `Llegó a ${llegaron.length}.` +
          (faltan ? ` A ${faltan} no les llegó (desinstalaron la app o bajaron el permiso).` : '')
      );
    } catch (err) {
      setResultado(`No se pudo mandar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[22px] text-[#00183a]">notifications_active</span>
            <h3 className="font-heading font-bold text-[16px] text-[#00183a] truncate">{envio.titulo}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1] shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-heading text-[11px] font-bold text-[#00183a] uppercase tracking-wide">Mensaje</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="min-h-28 px-3 py-2 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-sans text-[16px] sm:text-[13px] leading-snug text-[#191c1e] outline-none focus:bg-white focus:border-[#00183a] select-text"
            />
            <span className="font-sans text-[11px] text-[#747780]">
              {'{nombre}'} y los demás campos entre llaves se completan solos para cada jugador.
            </span>
          </label>

          {!isSupabaseConfigured ? (
            <p className="font-sans text-[13px] text-[#44474f]">En modo demo no se mandan notificaciones.</p>
          ) : envio.destinatarios.length === 0 ? (
            <p className="font-sans text-[13px] text-[#44474f]">No hay nadie para avisar.</p>
          ) : (
            <>
              <button
                type="button"
                onClick={mandar}
                disabled={conPush === null || pendientes.length === 0 || enviando}
                className="h-12 rounded-lg bg-[#00183a] text-white font-heading text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
                {conPush === null
                  ? 'Cargando…'
                  : enviando
                  ? 'Mandando…'
                  : pendientes.length
                  ? `Mandar a ${pendientes.length} ${pendientes.length === 1 ? 'jugador' : 'jugadores'}`
                  : notificados.size
                  ? 'Aviso mandado'
                  : 'Nadie activó las notificaciones todavía'}
              </button>
              {resultado && <p className="font-sans text-[12px] text-[#44474f]">{resultado}</p>}

              <div className="flex flex-col gap-1.5">
                <span className="font-heading text-[11px] font-bold text-[#00183a] uppercase tracking-wide">
                  Destinatarios ({activos.length} de {envio.destinatarios.length} con notificaciones)
                </span>
                <div className="rounded-lg border border-[#e0e3e6] divide-y divide-[#eceef1]">
                  {envio.destinatarios.map((p) => {
                    const estado = notificados.has(p.id)
                      ? { texto: 'Enviado', clase: 'text-emerald-700', icono: 'check_circle' }
                      : conPush?.has(p.id)
                      ? { texto: 'Notificaciones activas', clase: 'text-[#00183a]', icono: 'notifications_active' }
                      : conPush
                      ? { texto: 'No las activó', clase: 'text-[#ba1a1a]', icono: 'notifications_off' }
                      : { texto: '…', clase: 'text-[#747780]', icono: 'hourglass_empty' };
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <p className="font-heading text-[13px] font-bold text-[#00183a] truncate">
                          {p.firstName} {p.lastName}
                        </p>
                        <span className={`flex items-center gap-1 font-sans text-[11px] shrink-0 ${estado.clase}`}>
                          <span className="material-symbols-outlined text-[16px]">{estado.icono}</span>
                          {estado.texto}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {sinActivar.length > 0 && (
                  <p className="font-sans text-[11px] text-[#747780]">
                    A los que no las activaron no les llega nada. Mandales el cartel (Planilla → Cartel para el
                    plantel) para que instalen la app y las activen.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
