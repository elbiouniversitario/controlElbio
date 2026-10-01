import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { linkWhatsApp, normalizarCelular, rellenarPlantilla } from '../lib/whatsapp';
import { useTextos } from '../lib/textos';
import { variablesMensaje } from '../lib/mensajes';
import { isSupabaseConfigured } from '../lib/supabase';
import { jugadoresConPush, mandarNotificaciones } from '../lib/push';

export interface EnvioWhatsApp {
  titulo: string;
  /** Tema con el que queda en el historial de envíos. */
  tema: string;
  /** Texto con {nombre}, {vencimiento}, etc. */
  plantilla: string;
  destinatarios: Player[];
  /** Muestra "Mandar al grupo" (mensaje sin datos personales). */
  permitirGrupo?: boolean;
}

interface EnvioWhatsAppModalProps {
  envio: EnvioWhatsApp | null;
  onClose: () => void;
  /** Registra en el historial a quienes se les abrió el mensaje. */
  onRegistrar: (destinatarios: Player[], tema: string) => void;
}

/**
 * Abre WhatsApp con el mensaje ya escrito: uno por uno a cada jugador
 * (personalizado) o al grupo. No manda nada solo: cada envío lo confirma
 * quien usa la app en su WhatsApp.
 */
export const EnvioWhatsAppModal: React.FC<EnvioWhatsAppModalProps> = ({ envio, onClose, onRegistrar }) => {
  const t = useTextos();
  const [texto, setTexto] = useState('');
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState(false);
  // Notificaciones de la app: quiénes las activaron y qué pasó al mandarlas.
  const [conPush, setConPush] = useState<Set<string>>(new Set());
  const [notificados, setNotificados] = useState<Set<string>>(new Set());
  const [enviandoPush, setEnviandoPush] = useState(false);
  const [avisoPush, setAvisoPush] = useState<string | null>(null);

  useEffect(() => {
    setTexto(envio?.plantilla ?? '');
    setEnviados(new Set());
    setCopiado(false);
    setNotificados(new Set());
    setAvisoPush(null);
    if (!envio || !isSupabaseConfigured || envio.destinatarios.length === 0) {
      setConPush(new Set());
      return;
    }
    let cancelado = false;
    jugadoresConPush()
      .then((ids) => !cancelado && setConPush(ids))
      .catch(() => !cancelado && setConPush(new Set()));
    return () => {
      cancelado = true;
    };
  }, [envio]);

  if (!envio) return null;

  const textoGrupo = rellenarPlantilla(texto, { ...variablesMensaje(t), nombre: 'equipo' });
  const conCelular = envio.destinatarios.filter((p) => normalizarCelular(p.phone));
  const sinCelular = envio.destinatarios.filter((p) => !normalizarCelular(p.phone));

  const marcar = (p: Player) => {
    if (enviados.has(p.id)) return;
    setEnviados((prev) => new Set(prev).add(p.id));
    onRegistrar([p], envio.tema);
  };

  const paraNotificar = envio.destinatarios.filter((p) => conPush.has(p.id) && !notificados.has(p.id));

  const notificar = async () => {
    if (paraNotificar.length === 0 || enviandoPush) return;
    setEnviandoPush(true);
    setAvisoPush(null);
    try {
      const r = await mandarNotificaciones(
        envio.tema,
        paraNotificar.map((p) => ({ jugadorId: p.id, cuerpo: rellenarPlantilla(texto, variablesMensaje(t, p)) }))
      );
      const llegaron = paraNotificar.filter((p) => r.enviados.includes(p.id));
      setNotificados((prev) => new Set([...prev, ...llegaron.map((p) => p.id)]));
      if (llegaron.length) onRegistrar(llegaron, `Notificación: ${envio.tema}`);
      const faltan = paraNotificar.length - llegaron.length;
      setAvisoPush(
        `Llegó a ${llegaron.length}.` + (faltan ? ` A ${faltan} no les llegó: mandales por WhatsApp.` : '')
      );
    } catch (err) {
      setAvisoPush(`No se pudo mandar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEnviandoPush(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoGrupo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[22px] text-[#128c7e]">chat</span>
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

          {envio.permitirGrupo && (
            <div className="flex gap-2">
              <a
                href={linkWhatsApp(null, textoGrupo)}
                target="_blank"
                rel="noopener"
                onClick={() => onRegistrar([], `${envio.tema} (grupo)`)}
                className="flex-1 h-11 rounded-lg bg-[#25d366] text-white font-heading text-[12px] font-bold flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                Mandar al grupo
              </a>
              <button
                type="button"
                onClick={copiar}
                className="h-11 px-3 rounded-lg bg-[#e6e8eb] text-[#00183a] font-heading text-[12px] font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">{copiado ? 'check' : 'content_copy'}</span>
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          )}

          {envio.destinatarios.length > 0 && isSupabaseConfigured && (
            <div className="rounded-lg border border-[#d7e3ff] bg-[#f3f7ff] p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#00183a]">notifications_active</span>
                <span className="font-heading text-[12px] font-bold text-[#00183a]">
                  Notificación de la app: {envio.destinatarios.filter((p) => conPush.has(p.id)).length} de{' '}
                  {envio.destinatarios.length} la activaron
                </span>
              </div>
              <button
                type="button"
                onClick={notificar}
                disabled={paraNotificar.length === 0 || enviandoPush}
                className="h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {enviandoPush
                  ? 'Mandando…'
                  : paraNotificar.length
                  ? `Mandar notificación a ${paraNotificar.length}`
                  : notificados.size
                  ? 'Notificación mandada'
                  : 'Nadie la activó todavía'}
              </button>
              {avisoPush && <p className="font-sans text-[12px] text-[#44474f]">{avisoPush}</p>}
              <p className="font-sans text-[11px] text-[#747780]">
                Gratis y llega al instante. A los que no la activaron, mandales por WhatsApp acá abajo.
              </p>
            </div>
          )}

          {envio.destinatarios.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-heading text-[11px] font-bold text-[#00183a] uppercase tracking-wide">
                  Uno por uno ({enviados.size}/{conCelular.length})
                </span>
                <span className="font-sans text-[11px] text-[#747780]">Tocá cada uno para abrir WhatsApp</span>
              </div>
              <div className="rounded-lg border border-[#e0e3e6] divide-y divide-[#eceef1]">
                {conCelular.map((p) => {
                  const hecho = enviados.has(p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-heading text-[13px] font-bold text-[#00183a] truncate">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="font-sans text-[11px] text-[#747780]">
                          {p.phone}
                          {notificados.has(p.id) ? ' · 🔔 notificado' : conPush.has(p.id) ? ' · 🔔' : ''}
                        </p>
                      </div>
                      <a
                        href={linkWhatsApp(p.phone, rellenarPlantilla(texto, variablesMensaje(t, p)))}
                        target="_blank"
                        rel="noopener"
                        onClick={() => marcar(p)}
                        className={`h-9 px-3 rounded-lg font-heading text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                          hecho ? 'bg-emerald-100 text-emerald-800' : 'bg-[#25d366]/15 text-[#128c7e]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{hecho ? 'check' : 'send'}</span>
                        {hecho ? 'Abierto' : 'Enviar'}
                      </a>
                    </div>
                  );
                })}
                {sinCelular.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 opacity-70">
                    <p className="font-heading text-[13px] font-bold text-[#00183a] truncate">
                      {p.firstName} {p.lastName}
                    </p>
                    <span className="font-sans text-[11px] text-[#ba1a1a] shrink-0">Sin celular cargado</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {envio.destinatarios.length === 0 && !envio.permitirGrupo && (
            <p className="font-sans text-[13px] text-[#44474f]">No hay nadie para avisar.</p>
          )}
        </div>
      </div>
    </div>
  );
};
